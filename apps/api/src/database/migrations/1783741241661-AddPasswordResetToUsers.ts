import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPasswordResetToUsers1783741241661 implements MigrationInterface {
    name = 'AddPasswordResetToUsers1783741241661'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "reset_password_token_hash" text`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "UQ_f2ab4402ffaf0f0dabcca4f5702" UNIQUE ("reset_password_token_hash")`);
        await queryRunner.query(`ALTER TABLE "users" ADD "reset_password_expires_at" TIMESTAMP`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_f2ab4402ffaf0f0dabcca4f570" ON "users" ("reset_password_token_hash") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_f2ab4402ffaf0f0dabcca4f570"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "reset_password_expires_at"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "UQ_f2ab4402ffaf0f0dabcca4f5702"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "reset_password_token_hash"`);
    }

}
