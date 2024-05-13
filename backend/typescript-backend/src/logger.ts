import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const logsDir = join(__dirname, '..', 'logs');
if (!existsSync(logsDir)) {
  mkdirSync(logsDir);
}

const infoStream = createWriteStream(join(logsDir, 'info.log'), { flags: 'a' });
const errorStream = createWriteStream(join(logsDir, 'error.log'), { flags: 'a' });

const logger = {
  info: (message: string) => {
    console.log(message);
    infoStream.write(`${new Date().toISOString()} - INFO - ${message}\n`);
  },
  error: (message: string) => {
    console.error(message);
    errorStream.write(`${new Date().toISOString()} - ERROR - ${message}\n`);
  },
};

export default logger;
