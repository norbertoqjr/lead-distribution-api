import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial schema: admin users, brokers, the single form, the single
 * distribution, per-broker distribution settings, and leads.
 *
 * The `singleton` columns on forms and distributions carry a UNIQUE index and
 * are always written as 1, so a second row is rejected by the database even if
 * two requests pass the service-level check simultaneously. "More than one
 * form/distribution can be created" is an automatic fail condition, so this
 * guard does not rely on application code alone.
 */
export class InitialSchema1738000000000 implements MigrationInterface {
  name = 'InitialSchema1738000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`users\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`email\` VARCHAR(255) NOT NULL,
        \`password_hash\` VARCHAR(255) NOT NULL,
        \`name\` VARCHAR(255) NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_users_email\` (\`email\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`brokers\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`name\` VARCHAR(255) NOT NULL,
        \`is_active\` TINYINT NOT NULL DEFAULT 1,
        \`daily_cap\` INT NOT NULL DEFAULT 0,
        \`timezone\` VARCHAR(255) NOT NULL DEFAULT 'UTC',
        \`open_minute\` INT NOT NULL DEFAULT 0,
        \`close_minute\` INT NOT NULL DEFAULT 1440,
        \`working_days\` VARCHAR(255) NOT NULL DEFAULT '1,2,3,4,5',
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`forms\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`name\` VARCHAR(255) NOT NULL,
        \`slug\` VARCHAR(255) NOT NULL,
        \`singleton\` TINYINT NOT NULL DEFAULT 1,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_forms_slug\` (\`slug\`),
        UNIQUE INDEX \`IDX_forms_singleton\` (\`singleton\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`distributions\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`name\` VARCHAR(255) NOT NULL DEFAULT 'Default distribution',
        \`form_id\` INT NOT NULL,
        \`singleton\` TINYINT NOT NULL DEFAULT 1,
        \`is_active\` TINYINT NOT NULL DEFAULT 1,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_distributions_form_id\` (\`form_id\`),
        UNIQUE INDEX \`IDX_distributions_singleton\` (\`singleton\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_distributions_form\` FOREIGN KEY (\`form_id\`)
          REFERENCES \`forms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`distribution_brokers\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`distribution_id\` INT NOT NULL,
        \`broker_id\` INT NOT NULL,
        \`percentage\` DECIMAL(5,2) NOT NULL DEFAULT '0.00',
        \`is_active\` TINYINT NOT NULL DEFAULT 1,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX \`IDX_distribution_brokers_broker\` (\`broker_id\`),
        UNIQUE INDEX \`IDX_distribution_brokers_pair\` (\`distribution_id\`, \`broker_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_distribution_brokers_distribution\` FOREIGN KEY (\`distribution_id\`)
          REFERENCES \`distributions\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT \`FK_distribution_brokers_broker\` FOREIGN KEY (\`broker_id\`)
          REFERENCES \`brokers\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`leads\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`name\` VARCHAR(255) NOT NULL,
        \`email\` VARCHAR(255) NOT NULL,
        \`phone\` VARCHAR(255) NULL,
        \`ip_address\` VARCHAR(255) NOT NULL,
        \`form_id\` INT NULL,
        \`form_name\` VARCHAR(255) NOT NULL,
        \`distribution_id\` INT NULL,
        \`broker_id\` INT NULL,
        \`status\` ENUM('sent', 'unsent', 'duplicate', 'failed') NOT NULL DEFAULT 'unsent',
        \`assigned_at\` DATETIME NULL,
        \`note\` TEXT NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX \`IDX_leads_email\` (\`email\`),
        INDEX \`IDX_leads_status\` (\`status\`),
        INDEX \`IDX_leads_broker_assigned\` (\`broker_id\`, \`assigned_at\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_leads_form\` FOREIGN KEY (\`form_id\`)
          REFERENCES \`forms\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION,
        CONSTRAINT \`FK_leads_distribution\` FOREIGN KEY (\`distribution_id\`)
          REFERENCES \`distributions\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION,
        CONSTRAINT \`FK_leads_broker\` FOREIGN KEY (\`broker_id\`)
          REFERENCES \`brokers\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`leads\``);
    await queryRunner.query(`DROP TABLE \`distribution_brokers\``);
    await queryRunner.query(`DROP TABLE \`distributions\``);
    await queryRunner.query(`DROP TABLE \`forms\``);
    await queryRunner.query(`DROP TABLE \`brokers\``);
    await queryRunner.query(`DROP TABLE \`users\``);
  }
}
