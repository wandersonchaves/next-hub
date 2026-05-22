import * as dotenv from 'dotenv';
import * as path from 'path';

// Carrega o arquivo .env da raiz da app
dotenv.config({ path: path.join(__dirname, '../.env') });
