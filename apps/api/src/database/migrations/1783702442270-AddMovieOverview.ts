import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMovieOverview1783702442270 implements MigrationInterface {
    name = 'AddMovieOverview1783702442270'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "movies" ADD "overview" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "movies" DROP COLUMN "overview"`);
    }

}
