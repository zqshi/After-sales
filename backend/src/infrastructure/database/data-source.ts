import path from 'path';
import { fileURLToPath } from 'url';

import { DataSource } from 'typeorm';

import { config } from '../../config/app.config';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: config.database.host,
  port: config.database.port,
  username: config.database.user,
  password: config.database.password,
  database: config.database.name,
  synchronize: false, // 生产环境禁用，使用migrations
  logging: config.env === 'development',
  entities: [path.join(path.dirname(fileURLToPath(import.meta.url)), 'entities', '**', '*.{js,ts}')],
  migrations: [path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations', '**', '*.{js,ts}')],
  subscribers: [],
});
