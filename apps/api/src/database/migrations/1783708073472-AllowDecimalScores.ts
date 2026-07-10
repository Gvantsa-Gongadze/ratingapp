import { MigrationInterface, QueryRunner } from "typeorm";

export class AllowDecimalScores1783708073472 implements MigrationInterface {
    name = 'AllowDecimalScores1783708073472'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ratings" DROP CONSTRAINT "CHK_5c8b33535fb4eed4ae14c23579"`);
        await queryRunner.query(`ALTER TABLE "ratings" ALTER COLUMN "score" TYPE real USING "score"::real`);
        await queryRunner.query(`ALTER TABLE "ratings" ADD CONSTRAINT "CHK_5c8b33535fb4eed4ae14c23579" CHECK ("score" >= 1 AND "score" <= 10)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ratings" DROP CONSTRAINT "CHK_5c8b33535fb4eed4ae14c23579"`);
        await queryRunner.query(`ALTER TABLE "ratings" ALTER COLUMN "score" TYPE smallint USING ROUND("score")::smallint`);
        await queryRunner.query(`ALTER TABLE "ratings" ADD CONSTRAINT "CHK_5c8b33535fb4eed4ae14c23579" CHECK ("score" >= 1 AND "score" <= 10)`);
    }

}
