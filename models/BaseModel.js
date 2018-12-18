const SETTINGS = require('../settings')
const mysql = require('mysql')

/**
 * @description The Model from which all other models will inherit. Has basic functionality for connecting to the DB.
 * @author Jack Cole jcole2@mail.sfsu.edu
 */
class BaseModel{

    static get BASE_LIMIT_OF_RESULTS(){return 25}


    constructor(){
    }

    /**
     * @description Returns the name of the table in the database. Subclasses must overwrite this.
     * @returns String The table name in the database.
     * @private
     * @author Jack Cole jcole2@mail.sfsu.edu
     */
    get __TABLE(){throw "Not implemented"}

    /**
     * @description Connects to the database server and returns the connection object
     * @returns {Connection}
     * @private
     */
    static __connect(){
        let connection = mysql.createConnection({
            host     : SETTINGS.db.host,
            user     : SETTINGS.db.user,
            password : SETTINGS.db.password,
            database : SETTINGS.db.database,
        })
        connection.connect()
        return connection
    }

    /**
     * @description Disconnects the connection from the database server
     * @param connection {Connection}
     * @returns {*}
     * @private
     */
    static __disconnect(connection){
        return connection.end()
    }

    /**
     * @description Performs a query to the database.
     * @param connection {Connection} A connection that has been instantiated by __connect()
     * @param sql {String} The SQL query
     * @param callback {function} The function to execute after the query
     * @returns {*|Function}
     * @private
     */
    static __query(connection, sql, callback){
        return connection.query(sql, callback)
    }

    /**
     * @description Returns an Object containing the values from a single row. Since this shall be statically called, we need
     * to pass in the super class in the argument "model".
     * @param model {BaseModel} The model of the object that is being created
     * @param id The id of the row as it appears in the database. Must be an integer.
     * @param table2 {String} Table with certain information
     * @param table1_col {String} Specific column in table we would like to access.
     * @param table2_cpl {String} Specific column in table we would like to access.
     * @returns {Promise} The instantiated object of this class
     * @author Jack Cole jcole2@mail.sfsu.edu
     */
    static getSingleRowById(model, {id, table2, table1_col, table2_col}){
      let table = model.__TABLE



        let joinClause = ""
        if(typeof table2 !== "undefined" && typeof table1_col !== "undefined" && typeof table2_col !== "undefined")
            joinClause = `LEFT JOIN ${table2} ON ${table}.${table1_col} = ${table2}.${table2_col}`

        let sqlCommand = `SELECT * FROM ${table} ${joinClause} WHERE ${table}.id = ${id}`

        console.log("getSingleRowById() SQL:", sqlCommand)

      return new Promise(function(resolve, reject){
        let connection = BaseModel.__connect();

        BaseModel.__query(connection, {sql:sqlCommand,nestTables: true}, function (err, rows, fields) {
          if (err) throw err
          let data = {}
          if(rows.length !== 0)
            data = rows[0]
          resolve(model.objectMapper(data))
        })
        BaseModel.__disconnect(connection);
      })
    }


    /**
     * @description Retrieves multiple rows from a direct SQL command
     * @param model {BaseModel} The model being searched in the DB
     * @param sqlCommand {String} The full SQL command
     * @returns {Promise} The resulting rows mapped to the passed in model
     * @author Jack Cole jcole2@mail.sfsu.edu
     */
    static getMultipleBySQL(model, sqlCommand){
        console.log("getMultipleBySQL() SQL:", sqlCommand)
        return new Promise(function(resolve, reject){
            let connection = BaseModel.__connect();

            connection.query({sql:sqlCommand,nestTables: true}, function (err, rows, fields) {
                if (err) throw err
                let newObjects = rows.map(model.objectMapper)
                resolve(newObjects)
            })
            connection.end()
        })


    }

    /**
     * @description Retrieves multiple rows from filters. All filters are optional
     * @param model {BaseModel} The model being searched in the DB
     * @param filters [String] An array of SQL comparisons
     * @param page {Number} The page to view
     * @param count {Number} The number of entries to get. By default, will only get 25
     * @param sort {String} The column to sort by
     * @param direction {String} The direction to sort. By default, ascending. If true, then descending
     * @param table2 {String} Table with certain information
     * @param table1_col {String} Specific column in table we would like to access.
     * @param table2_cpl {String} Specific column in table we would like to access.
     * @returns {Promise} The resulting rows mapped to the passed in model
     * @author Jack Cole jcole2@mail.sfsu.edu
     * Anthony Carrasco acarras4@mail.sfsu.edu
     * Ryan Jin
     */
    static getMultipleByFilters(model, {filters, page, limit, sort, direction, table2, table1_col, table2_col}){
        //console.log('direction ', direction)
        if(direction === undefined) direction = "ASC"
        let table = model.__TABLE
        let whereClause = ""
        let orderByClause = ""
        let offset = 0
        let limitClause = `LIMIT ${offset},${BaseModel.BASE_LIMIT_OF_RESULTS}`

        let joinClause = ""
        if(typeof table2 !== "undefined" && typeof table1_col !== "undefined" && typeof table2_col !== "undefined")
            joinClause = `LEFT JOIN ${table2} ON ${table}.${table1_col} = ${table2}.${table2_col}`

        // If filters is an array
        if(typeof filters !== "undefined" && Array.isArray(filters))
            whereClause = `WHERE ${filters.join(" AND ")}`

        // Handling page and limit numbers. Have to check if limit is a valid number, then we can generated the offset
        // from the page number if that's a number. Then we combine them all.
        if(typeof limit !== "undefined")
        {
            limit = parseInt(limit)
            if( Number.isInteger(limit))
            {
                if(typeof page !== "undefined")
                {
                    page = parseInt(page)
                    if(Number.isInteger(page))
                        offset = (page-1) * limit
                }
                limitClause = `LIMIT ${offset}, ${limit}`
            }

        }

        // check for joinClause

        // Use the sort to determine the column to sort by
        if(typeof sort === "string"){
            orderByClause = `ORDER BY ${sort} ${direction}`
        }

        let sqlCommand = `SELECT * FROM ${table} ${joinClause} ${whereClause} ${orderByClause} ${limitClause}`
        console.log("getMultipleByFilters() SQL:", sqlCommand)
        return new Promise(function(resolve, reject){
            let connection = BaseModel.__connect();
            connection.query({sql:sqlCommand,nestTables: true}, function (err, rows, fields) {
                if (err) throw err
                let newObjects = rows.map(model.objectMapper)
                resolve(newObjects)
            })
            connection.end()
        })

    }

    /**
     * @description Inserts a new record to database
     * @param model {BaseModel} The model of the object being created
     * @param newRecord The new record to insert
     * @returns {Promise} The instantiated object of this class
     * @author Juan Ledezma
     */
    static insertNewRecord(model, newRecord) {
        let table = model.__TABLE
        let sqlCommand = `INSERT INTO ${table} SET ?`
        console.log("insertNewRecord() SQL:", sqlCommand)

        return new Promise(function(resolve, reject){
            let connection = BaseModel.__connect();

            connection.query({sql:sqlCommand,nestTables: true}, newRecord, function (err, results, fields) {
                if (err) {
                    console.log(err) //can't throw error because a duplicate email should just notify 
                                     //user that the email already exists
                    resolve({
                        status:false,
                        message:"Error: could not create new record."
                    })
                } else {
                    let confirmation = {
                        status:true,
                        data:results,
                        message:"Record inserted successfully",
                    }
                    resolve(confirmation)
                }
            })

            connection.end();
        })
    }

    /**
     * @description Updates the value of an attribute for a single record identified by its id
     * @param model To obtain table
     * @param record_id 
     * @param attribute Attribute to change
     * @param newValue New value to change attribute to
     * @author Juan Ledezma
     */
    static updateSingleRecordByID(model, record_id, attribute, newValue) {
        let table = model.__TABLE
        let sql = `UPDATE ${table} SET ${attribute} = '${newValue}' WHERE id = ${record_id};`
        console.log("updateSingleRecordByID() SQL: ", sql)

        return new Promise(function(resolve, reject) {
            let connection = BaseModel.__connect()

            connection.query({sql:sql,nestTables: true}, function(err, results, fields) {
                if (err) {
                    reject(err)
                } else {
                    let confirmation = {
                        status:true,
                        message:`Updated record id: ${record_id}, attribute: ${attribute}, to new value: ${newValue}`,
                        data:results
                    }
                    resolve(confirmation)
                }
            })

            connection.end()
        })
    }

    /**
     * @description
     * @param
     * @returns
     * @author Ryan Jin
     */
    static objectMapper(data){
        let obj = BaseModel()
        return obj
    }

}

// Required. This specifies what will be imported by other files
module.exports = BaseModel