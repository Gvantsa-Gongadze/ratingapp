import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCreatedAtToGroups1783750000000 implements MigrationInterface {
    name = 'AddCreatedAtToGroups1783750000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "groups" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "groups" DROP COLUMN "created_at"`);
    }

}
