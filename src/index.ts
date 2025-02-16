#!/usr/bin/env bun
import { confirm } from '@inquirer/prompts';
import {
    downloadOCRResults,
    generateRequestId,
    init as initOCR,
    isOCRFinished,
    mapOCRDataToPages,
    requestOCR,
} from '@ragaeeb/ocr-js';
import welcome from 'cli-welcome';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import packageJson from '../package.json' assert { type: 'json' };
import { loadConfiguration } from './utils/config.js';
import logger from './utils/logger.js';
import { getAnswers } from './utils/prompts.js';

const main = async () => {
    welcome({
        bgColor: `#FADC00`,
        bold: true,
        color: `#000000`,
        title: packageJson.name,
        version: packageJson.version,
    });

    const config = await loadConfiguration(packageJson.name, [
        'bucketUri',
        'processorId',
        'processorVersion',
        'projectId',
        'projectLocation',
    ]);

    initOCR({
        ...config,
        logger: (message) => logger.info(message),
    });

    const { language, outputFileName, pdf, resumeToken, volume } = await getAnswers();

    const requestId = resumeToken || generateRequestId(pdf);

    logger.info(`Checking if OCR already performed for ${requestId}`);
    const alreadyProcessed = await isOCRFinished(requestId);

    logger.info(`OCR already done: ${alreadyProcessed}`);
    const ocrEngine: { name?: string; timestamp: Date; version?: string } = { timestamp: new Date() };

    if (1 === Number(1)) {
        console.log(config, language, outputFileName, pdf, resumeToken, volume);
        return;
    }

    if (!alreadyProcessed) {
        const { name, processorVersionDisplayName, processorVersionName } = await requestOCR(pdf, {
            language,
            requestId,
        });

        ocrEngine.name = name;
        ocrEngine.version = `${processorVersionDisplayName}: ${processorVersionName}`;
    }

    const outputFolder = path.join(os.tmpdir(), path.parse(outputFileName).name);
    logger.info(`Downloading to ${outputFolder}...`);
    const files = await downloadOCRResults(requestId, { outputFolder });
    const pages = (await mapOCRDataToPages({ files })).map(({ id, text }) => {
        return { body: text, page: id, part: volume };
    });

    await fs.writeFile(outputFileName, JSON.stringify({ ocrEngine, pages }, null, 2));

    logger.info(`Written ${pages.length} pages to ${outputFileName}`);

    const deleteOutputFolder = await confirm({ message: `Do we you want to delete ${outputFolder}` });

    if (deleteOutputFolder) {
        await fs.rm(outputFolder, { recursive: true });
    }
};

main();
