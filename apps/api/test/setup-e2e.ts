import * as dotenv from 'dotenv';
import * as path from 'path';

// Carrega o arquivo .env da raiz do monorepo
dotenv.config({ path: path.join(__dirname, '../../../.env') });
