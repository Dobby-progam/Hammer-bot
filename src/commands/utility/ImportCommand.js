const Command = require('../Command');
const Request = require('../../Request');
const ModBotImporter = require('../../data/ModBotImporter');
const VortexImporter = require('../../data/VortexImporter');
const Exporter = require('../../data/Exporter');
const Importer = require('../../data/Importer');

class ImportDataCommand extends Command {

    static description = 'Import moderation data from Vortex';

    static usage = '';

    static names = ['import'];

    static comment = 'You need to attach the .json file exported from ModBot or Vortex to your message';

    static userPerms = ['MANAGE_SERVER'];

    static botPerms = [];

    async execute() {
        let dataUrl = this.source.isInteraction ? this.options.getAttachment('data').url
            : this.source.getRaw().attachments.first()?.url;
        if (!dataUrl) {
            await this.reply('Please attach a file to your message.');
            return;
        }

        const request = new Request(dataUrl);
        /** @type {Exporter|VortexImporter}*/
        let data;
        try {
            data = (await request.getJSON()).JSON;
        }
        catch (e) {
            if (typeof(e) === 'string' && e.startsWith('Failed to parse JSON response of')){
                await this.reply('Invalid JSON');
            }
            throw e;
        }

        const importer = this.getImporter(data);
        if (!importer) {
            await this.sendError('Unknown data type!');
            return;
        }

        try {
            importer.checkAllTypes();
        }
        catch (e) {
            if (e instanceof TypeError) {
                await this.reply('Invalid Data! Unable to import this');
                return;
            }
            else {
                throw e;
            }
        }
        await importer.import();
        await this.reply(importer.generateEmbed());
    }

    /**
     * get the correct importer for this datatype
     * @param data
     * @return {Importer|null}
     */
    getImporter(data) {
        if (!data.dataType)
            return new VortexImporter(this.bot, this.source.getGuild().id, data);
        if (data.dataType.toLowerCase().startsWith('modbot-1.'))
            return new ModBotImporter(this.bot, this.source.getGuild().id, data);

        return null;
    }

    static getOptions() {
        return [{
            name: 'data',
            type: 'ATTACHMENT',
            description: 'ModBot/vortex data',
            required: true
        }];
    }
}

module.exports = ImportDataCommand;
