var clearbitUrl = 'https://autocomplete.clearbit.com/v1/companies/suggest';

module.exports = function ($http) {
  var suggestCompanies = function (queryStr) {
    if (!queryStr) {
      return Promise.reject();
    }

    return $http.get(clearbitUrl, {
      params: { query: queryStr }
    })
    .then(function (resp) {
      return resp.data.filter(function (com) {
        return !!(com.name && com.domain); // at least has a name and domain
      });
    });
  };

  // companyObj comes in form of {name: 'name'}
  var addCompany = function (companyObj) {
    return $http.post('/api/company', companyObj)
    .then(function (resp) {
      return resp.data.id;
    }, function (err) {
      console.error('err', err);
    });
  };

  // companyID
  var deleteCompany = function (companyID) {
    return $http({
      method: 'DELETE',
      url: '/api/company/' + companyID
    })
    .then(function (resp) {
      return resp.data;
    }, function (err) {
      console.error('err', err);
    });
  };

  /**
   * @param  {Object} options = {size: Number}
   * @return {Promise} resolved to Array of company Objects
   */
  var getCompanies = function (options) {
    return $http.get('/api/companies', {
      params: options
    })
    .then(function (resp) {
      return resp.data;
    }, function (err) {
      console.error('err', err);
    });
  };

  /**
   * @param  {Number}   id            company id
   * @param  {Boolean}  domainAsID    first arg will be treated as domain if true
   * @return {Promise}                resolved to ompany Object
   */
  var getCompany = function (id, domainAsID) {
    var type = domainAsID ? 'domain' : 'id';

    return $http.get('/api/company/' + id, {
      params: {
        type: type
      }
    })
    .then(function (resp) {
      return resp.data;
    }, function (err) {
      console.error('err', err);
      return Promise.reject(err);
    });
  };

  var unfollow = function (company) {
    return $http.delete('/api/user/companies/' + company.id);
  };

  var follow = function (company) {
    console.log(company);
    var param = company.id || company.domain;
    return $http.post('/api/user/companies/' + param);
  };

  return {
    getCompany: getCompany,
    getCompanies: getCompanies,
    addCompany: addCompany,
    deleteCompany: deleteCompany,
    suggest: suggestCompanies,
    follow: follow,
    unfollow: unfollow
  };
};
