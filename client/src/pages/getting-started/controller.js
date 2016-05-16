var Promise = require('bluebird');
var inflection = require('inflection');
var _ = require('underscore');
var style = require('./getting-started.css');

module.exports = function ($scope, topCompanies, User, Company, $state) {
  var topCompaniesCache;
  $scope.style = style;
  $scope.numOfFollows = '';
  var toFollow = {};
  $scope.topCompanies = topCompaniesCache = topCompanies;
  $scope.getLength = function () {
    return Object.keys(toFollow).length;
  };

  $scope.continue = function () {
    console.log(toFollow);
    User.createTempUser().then(function () {
      return Promise.map(Object.keys(toFollow), function (domain) {
        return Company.follow(toFollow[domain]);
      });
    })
    .then(function () {
      $state.go('home', {}, { reload: true });
    });
  };

  $scope.toFollow = function (company) {
    var len = Object.keys(toFollow).length;
    if (company.isFollowing) {
      len -= 1;
      company.isFollowing = false;
      delete toFollow[company.domain];
      $scope.numOfFollows = inflection.inflect(len + ' company', Object.keys(toFollow).length);
    } else {
      len += 1;
      company.isFollowing = true;
      toFollow[company.domain] = company;
      $scope.numOfFollows = inflection.inflect(len + ' company', Object.keys(toFollow).length);
    }
    // console.log(toFollow);
  };

  $scope.suggest = _.debounce(function (queryStr) {
    if (queryStr === '') {
      return;
    }

    Company.suggest(queryStr)
    .then(function (suggestedCompanies) {
      $scope.topCompanies = $scope.topCompanies.filter(function (company) {
        return _.contains(Object.keys(toFollow), company.domain); // keep selected companies
      }).concat(suggestedCompanies.filter(function (sCom) {
        return !_.contains(Object.keys(toFollow), sCom.domain); // exclude selected companies
      })).map(function (company) {
        var fullCom = _.find(topCompaniesCache, function (cached) {
          return company.domain === cached.domain;
        });
        // console.log('>>', fullCom);
        return fullCom || company; // keep companies with stats
      });

      return $scope.topCompanies;
    })
    .then(function (freshTopComs) {
      var noJobs = freshTopComs.filter(function (allComs) {
        return allComs.job_count === undefined;
      });
      return Promise.map(noJobs, function (com) {
        return Company.getCompany(com.domain, true)
        .then(function (inDB) {
          $scope.topCompanies = $scope.topCompanies.map(function (comOnPage) {
            if (comOnPage.domain === inDB.domain) {
              comOnPage = inDB; // switch with full company
            }
            return comOnPage;
          });
        }, function () {
          var name = inflection
          .dasherize(
            angular
            .lowercase(com.name)
            .replace(/[^0-9a-zA-Z\s]/g, '')
          );

          angular.extend(com, {
            name: name,
            displayName: com.name
          });

          Company.addCompany(com);
          // console.log('comNotInDB ', comNotInDB);
        });
      });
    });
  }, 200);

  $scope.$watch('searchTerm', function (newVal) {
    if (newVal === '') $scope.topCompanies = topCompaniesCache;
  });
};

require('./getting-started.css');
