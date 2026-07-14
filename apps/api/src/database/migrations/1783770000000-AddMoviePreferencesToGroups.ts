import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMoviePreferencesToGroups1783770000000 implements MigrationInterface {
    name = 'AddMoviePreferencesToGroups1783770000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "groups" ADD "min_year" integer`);
        await queryRunner.query(`ALTER TABLE "groups" ADD "max_year" integer`);
        await queryRunner.query(`ALTER TABLE "groups" ADD "genres_include" text array`);
        await queryRunner.query(`ALTER TABLE "groups" ADD "genres_exclude" text array`);
        await queryRunner.query(`ALTER TABLE "groups" ADD "min_tmdb_rating" real`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "groups" DROP COLUMN "min_tmdb_rating"`);
        await queryRunner.query(`ALTER TABLE "groups" DROP COLUMN "genres_exclude"`);
        await queryRunner.query(`ALTER TABLE "groups" DROP COLUMN "genres_include"`);
        await queryRunner.query(`ALTER TABLE "groups" DROP COLUMN "max_year"`);
        await queryRunner.query(`ALTER TABLE "groups" DROP COLUMN "min_year"`);
    }

}
