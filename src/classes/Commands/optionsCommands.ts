import SteamID from 'steamid';
import { promises as fsp } from 'fs';
import * as path from 'path';

import Bot from '../Bot';
import CommandParser from '../CommandParser';
import { JsonOptions, removeCliOptions } from '../Options';

import { deepMerge } from '../../lib/tools/deep-merge';
import validator from '../../lib/validator';

export function optionsCommand(steamID: SteamID, bot: Bot): void {
    const liveOptions = deepMerge({}, bot.options);
    // remove any CLI stuff
    removeCliOptions(liveOptions);
    // remove Discord Webhook URLs
    delete liveOptions.discordWebhook.tradeSummary.url;
    delete liveOptions.discordWebhook.offerReview.url;
    delete liveOptions.discordWebhook.messages.url;
    delete liveOptions.discordWebhook.priceUpdate.url;
    delete liveOptions.discordWebhook.sendAlert.url;
    bot.sendMessage(steamID, `/code ${JSON.stringify(liveOptions, null, 4)}`);
}

export function updateOptionsCommand(steamID: SteamID, message: string, bot: Bot): void {
    const optionsPath = path.join(__dirname, `../../../files/${bot.options.steamAccountName}/options.json`);
    const params = CommandParser.parseParams(CommandParser.removeCommand(message));
    const saveOptions = deepMerge({}, bot.options);
    removeCliOptions(saveOptions);

    if (typeof params.highValue === 'object') {
        if (params.highValue.sheens !== undefined) {
            params.highValue.sheens = new Array(saveOptions.highValue.sheens.push(params.highValue.sheens));
        }
        if (params.highValue.killstreakers !== undefined) {
            params.highValue.killstreakers = new Array(
                saveOptions.highValue.killstreakers.push(params.highValue.killstreakers)
            );
            saveOptions.highValue.killstreakers.length = 0;
        }
    }

    if (typeof params.manualReview === 'object') {
        if (params.manualReview.invalidValue.exceptionValue.skus !== undefined) {
            params.manualReview.invalidValue.exceptionValue.skus = new Array(
                saveOptions.manualReview.invalidValue.exceptionValue.skus.push(
                    params.manualReview.invalidValue.exceptionValue.skus
                )
            );
            saveOptions.manualReview.invalidValue.exceptionValue.skus.length = 0;
        }
    }

    if (typeof params.discordWebhook === 'object') {
        if (params.discordWebhook.tradeSummary.url !== undefined) {
            params.discordWebhook.tradeSummary.url = new Array(
                saveOptions.discordWebhook.tradeSummary.url.push(params.discordWebhook.tradeSummary.url)
            );
            saveOptions.discordWebhook.tradeSummary.url.length = 0;
        }

        if (params.discordWebhook.tradeSummary.mentionOwner.itemSkus !== undefined) {
            params.discordWebhook.tradeSummary.mentionOwner.itemSkus = new Array(
                saveOptions.discordWebhook.tradeSummary.mentionOwner.itemSkus.push(
                    params.discordWebhook.tradeSummary.mentionOwner.itemSkus
                )
            );
            saveOptions.discordWebhook.tradeSummary.mentionOwner.itemSkus.length = 0;
        }
    }

    if (Object.keys(params).length === 0) {
        bot.sendMessage(steamID, '⚠️ Missing properties to update.');
        return;
    }

    const result: JsonOptions = deepMerge(saveOptions, params);

    const errors = validator(result, 'options');
    if (errors !== null) {
        bot.sendMessage(steamID, '❌ Error updating options: ' + errors.join(', '));
        return;
    }
    fsp.writeFile(optionsPath, JSON.stringify(saveOptions, null, 4), { encoding: 'utf8' })
        .then(() => {
            deepMerge(bot.options, saveOptions);
            return bot.sendMessage(steamID, '✅ Updated options!');
        })
        .catch(err => {
            bot.sendMessage(steamID, '❌ Error saving options file to disk: ' + err);
            return;
        });
}
