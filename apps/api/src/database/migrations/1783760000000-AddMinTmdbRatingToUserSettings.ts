import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMinTmdbRatingToUserSettings1783760000000 implements MigrationInterface {
    name = 'AddMinTmdbRatingToUserSettings1783760000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_settings" ADD "min_tmdb_rating" real`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_settings" DROP COLUMN "min_tmdb_rating"`);
    }

}
