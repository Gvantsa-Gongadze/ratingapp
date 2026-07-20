import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPerformanceIndexes1784487297181 implements MigrationInterface {
    name = 'AddPerformanceIndexes1784487297181'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX "IDX_3284ae1e36ea554d94ee71d041" ON "assignments" ("group_cycle_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_cbf450fac5d3e4fb7cfc759c9b" ON "assignments" ("group_id", "user_id", "status") `);
        await queryRunner.query(`CREATE INDEX "IDX_20a555b299f75843aa53ff8b0e" ON "group_members" ("user_id") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_20a555b299f75843aa53ff8b0e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_cbf450fac5d3e4fb7cfc759c9b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3284ae1e36ea554d94ee71d041"`);
    }

}
