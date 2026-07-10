import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSchema1783701509125 implements MigrationInterface {
    name = 'CreateSchema1783701509125'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "movies" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "tmdb_id" integer NOT NULL, "imdb_id" text, "title" character varying NOT NULL, "original_title" text, "year" integer, "poster_path" text, "genres" jsonb NOT NULL DEFAULT '[]', "runtime" integer, "tmdb_vote_avg" real, "tmdb_vote_count" integer, CONSTRAINT "UQ_a30f596bb8c7b8213cec64c5125" UNIQUE ("tmdb_id"), CONSTRAINT "PK_c5b2c134e871bfd1c2fe7cc3705" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_a30f596bb8c7b8213cec64c512" ON "movies" ("tmdb_id") `);
        await queryRunner.query(`CREATE TYPE "public"."groups_mode_enum" AS ENUM('sync', 'individual')`);
        await queryRunner.query(`CREATE TABLE "groups" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" character varying NOT NULL, "slug" character varying NOT NULL, "owner_id" uuid NOT NULL, "mode" "public"."groups_mode_enum" NOT NULL, "skip_timeout_hours" integer NOT NULL, "settings" jsonb NOT NULL DEFAULT '{}', CONSTRAINT "UQ_eccfe767267171ae21e7cbf183d" UNIQUE ("slug"), CONSTRAINT "PK_659d1483316afb28afd3a90646e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_eccfe767267171ae21e7cbf183" ON "groups" ("slug") `);
        await queryRunner.query(`CREATE TABLE "group_cycles" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "group_id" uuid NOT NULL, "movie_id" uuid, "number" integer NOT NULL, "started_at" TIMESTAMP NOT NULL DEFAULT now(), "completed_at" TIMESTAMP, CONSTRAINT "PK_ac062ad3a9281ea02e310ab053a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."assignments_status_enum" AS ENUM('active', 'rated', 'skipped', 'expired')`);
        await queryRunner.query(`CREATE TABLE "assignments" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "movie_id" uuid NOT NULL, "group_id" uuid, "group_cycle_id" uuid, "assigned_at" TIMESTAMP NOT NULL DEFAULT now(), "deadline_at" TIMESTAMP NOT NULL, "status" "public"."assignments_status_enum" NOT NULL, "resolved_at" TIMESTAMP, CONSTRAINT "PK_c54ca359535e0012b04dcbd80ee" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_d9b17ae77de155037962438cd8" ON "assignments" ("user_id") WHERE "group_id" IS NULL AND "status" = 'active'`);
        await queryRunner.query(`CREATE TABLE "group_invites" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "group_id" uuid NOT NULL, "code" character varying NOT NULL, "expires_at" TIMESTAMP, "max_uses" integer, CONSTRAINT "UQ_145bbc40f47d34c458ed6e9d96f" UNIQUE ("code"), CONSTRAINT "PK_ca736add48a2a0f2f7950e4ac9b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_145bbc40f47d34c458ed6e9d96" ON "group_invites" ("code") `);
        await queryRunner.query(`CREATE TYPE "public"."group_members_role_enum" AS ENUM('owner', 'member')`);
        await queryRunner.query(`CREATE TABLE "group_members" ("group_id" uuid NOT NULL, "user_id" uuid NOT NULL, "role" "public"."group_members_role_enum" NOT NULL, "joined_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f5939ee0ad233ad35e03f5c65c1" PRIMARY KEY ("group_id", "user_id"))`);
        await queryRunner.query(`CREATE TABLE "ratings" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "assignment_id" uuid NOT NULL, "user_id" uuid NOT NULL, "movie_id" uuid NOT NULL, "score" smallint NOT NULL, "review_text" text, "rated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_0055c8e6f4bb71f335ccb412c87" UNIQUE ("assignment_id"), CONSTRAINT "REL_0055c8e6f4bb71f335ccb412c8" UNIQUE ("assignment_id"), CONSTRAINT "CHK_5c8b33535fb4eed4ae14c23579" CHECK ("score" >= 1 AND "score" <= 10), CONSTRAINT "PK_0f31425b073219379545ad68ed9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_0055c8e6f4bb71f335ccb412c8" ON "ratings" ("assignment_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_1c46d6fbe1ed8043c47345c78c" ON "ratings" ("movie_id", "rated_at") `);
        await queryRunner.query(`CREATE TABLE "user_settings" ("user_id" uuid NOT NULL, "min_year" integer, "max_year" integer, "genres_include" text array, "genres_exclude" text array, "min_tmdb_votes" integer, "min_runtime" integer, "max_runtime" integer, CONSTRAINT "PK_4ed056b9344e6f7d8d46ec4b302" PRIMARY KEY ("user_id"))`);
        await queryRunner.query(`ALTER TABLE "groups" ADD CONSTRAINT "FK_5d7af25843377def343ab0beaa8" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "group_cycles" ADD CONSTRAINT "FK_04cd52c0e3b4eadd28ee89de0b8" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "group_cycles" ADD CONSTRAINT "FK_bc757fda9d2b41790831659f966" FOREIGN KEY ("movie_id") REFERENCES "movies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "assignments" ADD CONSTRAINT "FK_3e96b2dc80534b727b58b87b85f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "assignments" ADD CONSTRAINT "FK_f62c996613fbfe0b0eee2254d05" FOREIGN KEY ("movie_id") REFERENCES "movies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "assignments" ADD CONSTRAINT "FK_9a52a70c18d351ddab148eaf849" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "assignments" ADD CONSTRAINT "FK_3284ae1e36ea554d94ee71d041f" FOREIGN KEY ("group_cycle_id") REFERENCES "group_cycles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "group_invites" ADD CONSTRAINT "FK_74273612fc6076c533f12b9e6ba" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "group_members" ADD CONSTRAINT "FK_2c840df5db52dc6b4a1b0b69c6e" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "group_members" ADD CONSTRAINT "FK_20a555b299f75843aa53ff8b0ee" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ratings" ADD CONSTRAINT "FK_0055c8e6f4bb71f335ccb412c87" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ratings" ADD CONSTRAINT "FK_f49ef8d0914a14decddbb170f2f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ratings" ADD CONSTRAINT "FK_45c7bafa4e537191add4eeed5b3" FOREIGN KEY ("movie_id") REFERENCES "movies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_settings" ADD CONSTRAINT "FK_4ed056b9344e6f7d8d46ec4b302" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_settings" DROP CONSTRAINT "FK_4ed056b9344e6f7d8d46ec4b302"`);
        await queryRunner.query(`ALTER TABLE "ratings" DROP CONSTRAINT "FK_45c7bafa4e537191add4eeed5b3"`);
        await queryRunner.query(`ALTER TABLE "ratings" DROP CONSTRAINT "FK_f49ef8d0914a14decddbb170f2f"`);
        await queryRunner.query(`ALTER TABLE "ratings" DROP CONSTRAINT "FK_0055c8e6f4bb71f335ccb412c87"`);
        await queryRunner.query(`ALTER TABLE "group_members" DROP CONSTRAINT "FK_20a555b299f75843aa53ff8b0ee"`);
        await queryRunner.query(`ALTER TABLE "group_members" DROP CONSTRAINT "FK_2c840df5db52dc6b4a1b0b69c6e"`);
        await queryRunner.query(`ALTER TABLE "group_invites" DROP CONSTRAINT "FK_74273612fc6076c533f12b9e6ba"`);
        await queryRunner.query(`ALTER TABLE "assignments" DROP CONSTRAINT "FK_3284ae1e36ea554d94ee71d041f"`);
        await queryRunner.query(`ALTER TABLE "assignments" DROP CONSTRAINT "FK_9a52a70c18d351ddab148eaf849"`);
        await queryRunner.query(`ALTER TABLE "assignments" DROP CONSTRAINT "FK_f62c996613fbfe0b0eee2254d05"`);
        await queryRunner.query(`ALTER TABLE "assignments" DROP CONSTRAINT "FK_3e96b2dc80534b727b58b87b85f"`);
        await queryRunner.query(`ALTER TABLE "group_cycles" DROP CONSTRAINT "FK_bc757fda9d2b41790831659f966"`);
        await queryRunner.query(`ALTER TABLE "group_cycles" DROP CONSTRAINT "FK_04cd52c0e3b4eadd28ee89de0b8"`);
        await queryRunner.query(`ALTER TABLE "groups" DROP CONSTRAINT "FK_5d7af25843377def343ab0beaa8"`);
        await queryRunner.query(`DROP TABLE "user_settings"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1c46d6fbe1ed8043c47345c78c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0055c8e6f4bb71f335ccb412c8"`);
        await queryRunner.query(`DROP TABLE "ratings"`);
        await queryRunner.query(`DROP TABLE "group_members"`);
        await queryRunner.query(`DROP TYPE "public"."group_members_role_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_145bbc40f47d34c458ed6e9d96"`);
        await queryRunner.query(`DROP TABLE "group_invites"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d9b17ae77de155037962438cd8"`);
        await queryRunner.query(`DROP TABLE "assignments"`);
        await queryRunner.query(`DROP TYPE "public"."assignments_status_enum"`);
        await queryRunner.query(`DROP TABLE "group_cycles"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_eccfe767267171ae21e7cbf183"`);
        await queryRunner.query(`DROP TABLE "groups"`);
        await queryRunner.query(`DROP TYPE "public"."groups_mode_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a30f596bb8c7b8213cec64c512"`);
        await queryRunner.query(`DROP TABLE "movies"`);
    }

}
