var inflection = require('inflection');
module.exports = function ($scope, currentCompany, Company, $state) {
  $scope.company = currentCompany;
  $scope.mapURI = window.encodeURIComponent($scope.company.location);
  $scope.followText = inflection.inflect('people', currentCompany.follow_count);

  // methods
  $scope.follow = followCompany;
  $scope.unfollow = unfollowCompany;

  function unfollowCompany() {
    Company.unfollow(currentCompany).then(function () {
      $state.reload();
    });
  }

  function followCompany() {
    Company.follow(currentCompany).then(function () {
      $state.reload();
    });
  }
};
