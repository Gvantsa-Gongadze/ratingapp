import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  GroupDetailDto,
  GroupDto,
  GroupInviteDto,
  GroupMode,
  GroupSettingsDto,
  GroupSettingsResponseDto,
  MessageResponseDto,
} from '@ratingapp/shared-types';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { assertNoGenreOverlap, assertValidYearRange } from '../common/preferences-validation.util';
import { GENRE_NAMES } from '../movies/tmdb/tmdb-genres';
import { GroupInvite } from './entities/group-invite.entity';
import { GroupMember } from './entities/group-member.entity';
import { Group } from './entities/group.entity';

const DEFAULT_SKIP_TIMEOUT_HOURS = 24;

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group)
    private readonly groupsRepository: Repository<Group>,
    @InjectRepository(GroupMember)
    private readonly groupMembersRepository: Repository<GroupMember>,
    @InjectRepository(GroupInvite)
    private readonly groupInvitesRepository: Repository<GroupInvite>,
  ) {}

  async listMyGroups(userId: string): Promise<GroupDto[]> {
    const memberships = await this.groupMembersRepository.find({
      where: { userId },
      relations: ['group'],
      order: { joinedAt: 'DESC' },
    });
    if (memberships.length === 0) return [];

    const groupIds = memberships.map((m) => m.groupId);
    const counts = await this.groupMembersRepository
      .createQueryBuilder('gm')
      .select('gm.group_id', 'groupId')
      .addSelect('COUNT(*)', 'count')
      .where('gm.group_id IN (:...groupIds)', { groupIds })
      .groupBy('gm.group_id')
      .getRawMany<{ groupId: string; count: string }>();
    const countByGroupId = new Map(counts.map((c) => [c.groupId, Number(c.count)]));

    return memberships.map((m) => ({
      id: m.group.id,
      name: m.group.name,
      slug: m.group.slug,
      mode: m.group.mode,
      memberCount: countByGroupId.get(m.groupId) ?? 1,
      role: m.role,
      createdAt: m.group.createdAt.toISOString(),
    }));
  }

  async createGroup(userId: string, name: string, mode: GroupMode): Promise<GroupDetailDto> {
    const group = this.groupsRepository.create({
      name,
      slug: this.generateSlug(name),
      ownerId: userId,
      mode,
      skipTimeoutHours: DEFAULT_SKIP_TIMEOUT_HOURS,
      settings: {},
    });
    const saved = await this.groupsRepository.save(group);

    const membership = this.groupMembersRepository.create({
      groupId: saved.id,
      userId,
      role: 'owner',
    });
    await this.groupMembersRepository.save(membership);

    return this.getGroupDetail(userId, saved.id);
  }

  async getGroupDetail(userId: string, groupId: string): Promise<GroupDetailDto> {
    const membership = await this.groupMembersRepository.findOne({
      where: { groupId, userId },
      relations: ['group'],
    });
    if (!membership) {
      throw new NotFoundException('Group not found');
    }

    const members = await this.groupMembersRepository.find({
      where: { groupId },
      relations: ['user'],
      order: { joinedAt: 'ASC' },
    });

    return {
      id: membership.group.id,
      name: membership.group.name,
      slug: membership.group.slug,
      mode: membership.group.mode,
      memberCount: members.length,
      role: membership.role,
      createdAt: membership.group.createdAt.toISOString(),
      members: members.map((m) => ({
        userId: m.user.id,
        username: m.user.username,
        avatarUrl: m.user.avatarUrl,
        role: m.role,
        joinedAt: m.joinedAt.toISOString(),
      })),
    };
  }

  async createInvite(userId: string, groupId: string): Promise<GroupInviteDto> {
    const membership = await this.groupMembersRepository.findOneBy({ groupId, userId });
    if (!membership) {
      throw new NotFoundException('Group not found');
    }
    if (membership.role !== 'owner') {
      throw new ForbiddenException('Only the group owner can create invites');
    }

    const invite = this.groupInvitesRepository.create({
      groupId,
      code: this.generateInviteCode(),
      expiresAt: null,
      maxUses: null,
    });
    const saved = await this.groupInvitesRepository.save(invite);

    return { code: saved.code, expiresAt: null, maxUses: null };
  }

  async joinGroup(userId: string, code: string): Promise<GroupDetailDto> {
    const invite = await this.groupInvitesRepository.findOneBy({ code });
    if (!invite || (invite.expiresAt && invite.expiresAt.getTime() < Date.now())) {
      throw new BadRequestException('Invalid or expired invite code');
    }

    const existing = await this.groupMembersRepository.findOneBy({ groupId: invite.groupId, userId });
    if (existing) {
      throw new ConflictException('You are already a member of this group');
    }

    const membership = this.groupMembersRepository.create({
      groupId: invite.groupId,
      userId,
      role: 'member',
    });
    await this.groupMembersRepository.save(membership);

    return this.getGroupDetail(userId, invite.groupId);
  }

  async leaveGroup(userId: string, groupId: string): Promise<MessageResponseDto> {
    const membership = await this.groupMembersRepository.findOneBy({ groupId, userId });
    if (!membership) {
      throw new NotFoundException('Group not found');
    }
    if (membership.role === 'owner') {
      throw new BadRequestException('Group owners cannot leave — delete the group instead');
    }
    await this.groupMembersRepository.remove(membership);
    return { message: 'You left the group' };
  }

  async getSettings(userId: string, groupId: string): Promise<GroupSettingsResponseDto> {
    const membership = await this.groupMembersRepository.findOne({
      where: { groupId, userId },
      relations: ['group'],
    });
    if (!membership) {
      throw new NotFoundException('Group not found');
    }
    return { settings: this.toSettingsDto(membership.group), availableGenres: GENRE_NAMES };
  }

  async updateGenrePreferences(
    userId: string,
    groupId: string,
    genresInclude: string[],
    genresExclude: string[],
  ): Promise<GroupSettingsResponseDto> {
    assertNoGenreOverlap(genresInclude, genresExclude);

    const group = await this.requireOwnedGroup(userId, groupId);
    group.genresInclude = genresInclude.length > 0 ? genresInclude : null;
    group.genresExclude = genresExclude.length > 0 ? genresExclude : null;
    const saved = await this.groupsRepository.save(group);

    return { settings: this.toSettingsDto(saved), availableGenres: GENRE_NAMES };
  }

  async updateYearRange(
    userId: string,
    groupId: string,
    minYear: number | null,
    maxYear: number | null,
  ): Promise<GroupSettingsResponseDto> {
    assertValidYearRange(minYear, maxYear);

    const group = await this.requireOwnedGroup(userId, groupId);
    group.minYear = minYear;
    group.maxYear = maxYear;
    const saved = await this.groupsRepository.save(group);

    return { settings: this.toSettingsDto(saved), availableGenres: GENRE_NAMES };
  }

  async updateMinRating(userId: string, groupId: string, minRating: number | null): Promise<GroupSettingsResponseDto> {
    const group = await this.requireOwnedGroup(userId, groupId);
    group.minTmdbRating = minRating;
    const saved = await this.groupsRepository.save(group);

    return { settings: this.toSettingsDto(saved), availableGenres: GENRE_NAMES };
  }

  private async requireOwnedGroup(userId: string, groupId: string): Promise<Group> {
    const membership = await this.groupMembersRepository.findOneBy({ groupId, userId });
    if (!membership) {
      throw new NotFoundException('Group not found');
    }
    if (membership.role !== 'owner') {
      throw new ForbiddenException('Only the group owner can change movie preferences');
    }

    const group = await this.groupsRepository.findOneBy({ id: groupId });
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    return group;
  }

  private toSettingsDto(group: Group): GroupSettingsDto {
    return {
      minYear: group.minYear ?? null,
      maxYear: group.maxYear ?? null,
      minTmdbRating: group.minTmdbRating ?? null,
      genresInclude: group.genresInclude ?? null,
      genresExclude: group.genresExclude ?? null,
    };
  }

  private generateSlug(name: string): string {
    const base =
      name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40) || 'group';
    const suffix = randomBytes(3).toString('hex');
    return `${base}-${suffix}`;
  }

  private generateInviteCode(): string {
    return randomBytes(4).toString('hex').toUpperCase();
  }
}
