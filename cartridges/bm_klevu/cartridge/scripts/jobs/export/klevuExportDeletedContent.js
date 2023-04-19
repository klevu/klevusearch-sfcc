'use strict';

/* API Includes */
const Site = require('dw/system/Site');
const File = require('dw/io/File');
const Calendar = require('dw/util/Calendar');
const ContentMgr = require('dw/content/ContentMgr');
const StringUtils = require('dw/util/StringUtils');

/* Script Includes */
const CsvWriter = require('~/cartridge/scripts/utils/csvWriter');
const klevuUtils = require('~/cartridge/scripts/utils/klevuUtilsBm');
const deletedXmlUtils = require('~/cartridge/scripts/utils/deletedXmlUtils');
const CsvReader = require('~/cartridge/scripts/utils/csvReader');

/* Global variables */
const config = klevuUtils.config;
const timeStamp = StringUtils.formatCalendar(new Calendar(), 'yyyyMMddHHmmss');

/**
 * Runs the relevant functions
 */
function run() {
    var directory = new File(StringUtils.format(config.baseKlevuPath + config.sentContentPath, Site.getCurrent().ID));

    if (directory && directory.isDirectory()) {
        var filesList = directory.listFiles(function (file) {
            return file.isFile();
        });
        if (filesList && filesList.size()) {
            var csvWriter = new CsvWriter(config.sentContentHeader);
            csvWriter.initializeCSVStreamWriter(
                StringUtils.format(config.baseKlevuPath + config.sentContentPath, Site.getCurrent().ID),
                StringUtils.format(config.sentContentFileName, StringUtils.formatCalendar(new Calendar(), 'yyyyMMddHHmmssSSS'))
            );
            var xmlWriter = deletedXmlUtils.createXML(StringUtils.format(config.deletedContentFileName, timeStamp));
            var iterator = filesList.iterator();
            var file;

            while (iterator.hasNext()) {
                file = iterator.next();
                var csvReader = new CsvReader(file);
                csvReader.readHeader();
                var line;

                while ((line = csvReader.readLine()) !== null) { // eslint-disable-line no-cond-assign
                    if (config.sentContentHeader in line && line[config.sentContentHeader]) {
                        var contentID = line[config.sentContentHeader].replace(config.contentPrefix, '');
                        var content = ContentMgr.getContent(contentID);

                        if (!content || !content.onlineFlag) {
                            deletedXmlUtils.writeRecord(xmlWriter.xsw, line[config.sentContentHeader]);
                        } else {
                            csvWriter.writeLine(line[config.sentContentHeader]);
                        }
                    }
                }
                file.remove();
            }
            deletedXmlUtils.closeXML(xmlWriter.file, xmlWriter.xsw, xmlWriter.fw, config.contentObject);
            csvWriter.closeStream();
        }
    }
}

module.exports = {
    Run: run
};
