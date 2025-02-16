import type { Config } from '@ragaeeb/ocr-js';

import { input } from '@inquirer/prompts';
import Conf from 'conf';
import fs from 'node:fs';
import process from 'node:process';

export const loadConfiguration = async (projectName: string, keys: string[]): Promise<Config> => {
    const config = new Conf({ projectName });

    const prompts = keys
        .filter((key) => !config.has(key))
        .map((key) => {
            return {
                key,
                message: `Enter ${key}:`,
                required: true,
                transformer: (input: string) => input.trim(),
                validate: (input: string) => (input ? true : `${key} is required.`),
            };
        });

    if (!config.has('credentials') || !fs.existsSync(config.get('credentials') as string)) {
        prompts.push({
            key: 'credentials',
            message: 'Enter the path to the credentials file:',
            required: true,
            transformer: (input: string) => input.trim(),
            validate: (input) => (input && fs.existsSync(input) ? true : 'Credentials file is required.'),
        });
    }

    for (const { key, ...prompt } of prompts) {
        const answer = await input(prompt);
        config.set(key, answer);
    }

    const result: Record<string, string> = keys.reduce(
        (acc, key) => ({ ...acc, [key]: config.get(key) as string }),
        {},
    );

    process.env.GOOGLE_APPLICATION_CREDENTIALS = config.get('credentials') as string;

    return result as unknown as Config;
};
