/**
 * CSV File Reader
 *  - Capability to read a header row and return an associative array for each row
 *  - Utilizes fileReader to read large files on a per-line basis
 */

'use strict';

/* global empty */

var FileReader = require('dw/io/FileReader');

/**
 * CSVReader
 *
 * @param {dw.io.File} csvFile the CSV file
 */
var CSVReader = function (csvFile) {
    this.headerColumns = [];
    this.fileReader = new FileReader(csvFile);
    this.divider = ';';

    /**
     * @param {string} newDivider Set the divier, e.g. "," or "\t"
     */
    this.setDivider = function (newDivider) {
        this.divider = newDivider;
    };

    /**
     * Reads the header and stores the column names
     */
    this.readHeader = function () {
        var headerContent = this.fileReader.readLine();
        if (!empty(headerContent)) {
            this.headerColumns = headerContent.split(this.divider); // Read Header
        } else {
            this.headerColumns = null;
        }
    };


    /**
     * Returns a list of column names in the order they appeared in the CSV
     *
     * @returns {Array} header colums
     */
    this.getHeader = function () {
        return this.headerColumns;
    };


    /**
     * Reads the next line and returns an associative array with the corresponding values
     *
     * @returns {Object} the object containing single line of CSV file
     */
    this.readLine = function () {
        var line = this.fileReader.readLine();

        if (line === null) {
            return null;
        }

        line = line.split(this.divider);

        var outputLine = {};

        for (let i = 0; i < this.headerColumns.length; i++) {
            outputLine[this.headerColumns[i]] = line[i];
        }

        return outputLine;
    };
};


module.exports = CSVReader;
