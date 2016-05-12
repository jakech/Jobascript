var helpers = require('./helpers');
var _ = require('underscore');

const TABLE_NAME = 'jobs';

module.exports = function (db) {
  var Jobs = {};


  Jobs.clearAllJobs = function () {
    return db.none('DELETE FROM ${table~};', { table: TABLE_NAME });
  };

  /**
   * get jobs by company id or any column criteria
   * @param  {Object}   options - e.g. {company_id: '213', remote_ok: true}
   * @return {Promise}            resolve in to an array of jobs
   */
  Jobs.getJobs = function (options) {
    var sqlStr = [
      'SELECT * FROM ${table~}',
      'WHERE ' + helpers.toSqlString(options, 'AND'),
      ';'
    ].join(' ');

    return db.any(sqlStr, {
      table: TABLE_NAME
    });
  };

  Jobs.updateJobs = function (jobId, args) {
    if (jobId === undefined) {
      return Promise.reject('must have a jobId');
    }
    if (args === undefined) {
      return Promise.reject('must have arguments');
    }
    var sqlStr = 'UPDATE ${table~} SET ' +
    helpers.toSqlString(args, ',') +
    ' WHERE id=$$${job_id}$$ RETURNING *;';

    return db.one(sqlStr, {
      table: TABLE_NAME,
      job_id: Number(jobId)
    });
  };

  Jobs.addJob = function (jobListing) {
    if (!jobListing) {
      throw new Error('a job obj is required to query for jobs e.g {title: \'software engineer\'}, your data: ' + JSON.stringify(jobListing));
    }
    if (jobListing.title === undefined) {
      throw new Error('need a title, your data: ' + JSON.stringify(jobListing));
    }
    if (jobListing.city === undefined) {
      throw new Error('need a city, your data: ' + JSON.stringify(jobListing));
    }

    var noDup = 'SELECT * FROM jobs ' +
                'WHERE title=${title} AND ' +
                'city LIKE ${city} AND created=${created};';

    /* eslint-disable */
    var sqlStr = [
      'INSERT INTO ${table~} (',
      Object.keys(jobListing).toString(),
      ') VALUES (',
      _.map(jobListing, function (value) {
        return '$$' + value + '$$'
      }).toString(),
      ') RETURNING id;'
    ].join(' ');
    /* eslint-enable */
    return db.tx(function (t) {
      return t.batch([
        t.none(noDup, jobListing),
        t.one(sqlStr, { table: TABLE_NAME })
      ]);
    })
    .then(function (arr) {
      return arr[1].id;
    })
    .catch(function (err) {
      if (err[0] && err[0].success) { // check if it failed the duplicates check
        return Promise.reject(err[1].result);
      }

      return Promise.reject(err);
    });
  };

  return Jobs;
};
