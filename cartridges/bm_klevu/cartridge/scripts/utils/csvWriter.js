'use strict';

const File = require('dw/io/File');

/**
 * Utility used for writing CSV files.
 * @param {Array} titles is array of CSV column titles
 * @param {dw.system.Logger} logger is the logger used to store info about the CSV processing (optional)
 */
const csvWriter = function (titles, logger) {
    this.dir = null; // location of the CSV file
    this.file = null; // CSV file instance
    this.csvWriterInstance = null; // CSV writer instance
    this.titles = titles; // CSV column titles
    this.logger = logger; // CSV process logger

    /**
     * Create CSVStreamWriter, CSV-File and Directory if not exists.
     * @param {string} rootDirectory is the directory of the generated file
     * @param {string} fileName is the file name that will be generated
     */
    this.initializeCSVStreamWriter = function (rootDirectory, fileName) {
        const CSVStreamWriter = require('dw/io/CSVStreamWriter');
        const FileWriter = require('dw/io/FileWriter');
        this.dir = rootDirectory + File.SEPARATOR;
        const dir = new File(this.dir);
        if (!dir.exists()) {
            try {
                dir.mkdirs();
            } catch (e) {
                if (this.logger) {
                    this.logger.error('Cannot create CSV file directory: {0}', e);
                }
                throw new Error('Directory with the CSV file cannot be created');
            }
        }
        try {
            this.file = new File(this.dir + fileName);
            this.csvWriterInstance = new CSVStreamWriter(new FileWriter(this.file, 'UTF-8'), ',');
            this.writeLine(this.titles);
        } catch (e) {
            this.file = null;
            this.csvWriterInstance = null;
            if (this.logger) {
                this.logger.error('Cannot create CSV file: {0}', e);
            }
            throw new Error('An error occurred during CSV file creation.');
        }
    };

    /**
     * Writes CSV line.
     * @param {Array} line is array of cell values
     */
    this.writeLine = function (line) {
        this.csvWriterInstance.writeNext(line);
    };

    /**
     * Closes CSV writer.
     */
    this.closeStream = function () {
        // Closes stream writer
        if (this.csvWriterInstance) {
            this.csvWriterInstance.close();
            this.csvWriterInstance = null;
        }
        if (this.file) {
            this.file = null;
        }
    };
};

module.exports = csvWriter;
