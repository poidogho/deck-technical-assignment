import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create status enum type
  await knex.raw(`
    DO $$ BEGIN
      CREATE TYPE job_status AS ENUM ('pending', 'processing', 'completed', 'failed');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  // Create jobs table
  await knex.schema.createTable('jobs', (table) => {
    table.text('id').primary();
    table.text('api_key').notNullable();
    table.text('url').notNullable();
    table
      .specificType('status', 'job_status')
      .notNullable()
      .defaultTo('pending');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('completed_at').nullable();
    table.text('result_location').nullable();

    // Add index on api_key for faster filtering in listByApiKey
    table.index('api_key');
    // Add index on status for filtering
    table.index('status');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('jobs');
  await knex.raw('DROP TYPE IF EXISTS job_status');
}
