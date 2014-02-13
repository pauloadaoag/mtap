app = angular.module('mtap-quizmaster', ['ngRoute'])

app.factory('socket', function ($rootScope) {
  var socket = io.connect();

  socket.on('connect', function(){
    socket.emit('identify', {"identity":"quizmaster"})
  })
  return {
    on: function (eventName, callback) {
      socket.on(eventName, function () {  
        var args = arguments;
        $rootScope.$apply(function () {
          callback.apply(socket, args);
        });
      });
    },
    emit: function (eventName, data, callback) {
      socket.emit(eventName, data, function () {
        var args = arguments;
        $rootScope.$apply(function () {
          if (callback) {
            callback.apply(socket, args);
          }
        });
      })
    }
  };
});

app.controller('appctrl', ['$rootScope','$route','$location', '$http', function($rootScope,$route,$location,$http){
  

}]);

app.config(['$routeProvider',
  function($routeProvider) {
    $routeProvider.
      when('/', {
        templateUrl: '/templates/index.html',
        controller: 'indexCtrl'
      }).
      when('/quiz/:quizId', {
        templateUrl: '/templates/quiz.html',
        controller: 'quizCtrl'
      }).
      when('/create', {
        templateUrl: '/templates/create.html',
        controller: 'createCtrl'
      }).
      otherwise({
        redirectTo: '/'
      });
}]);




app.controller('quizCtrl', function ($scope, $http, $routeParams, socket){
  var quizId = $routeParams.quizId;
  
  $scope.schools = [{
      schoolName : 'Grace Christian High School'
    , schoolId   : 1
    , currentAnswer: {
          src: 'http://placedog.com/400/300'
        , judged : true
    }
  }];    


  socket.on('answer', function(data){
    $scope.schools = $scope.schools.map(function(school){
      if (school.schoolId == parseInt(data.schoolId)){
        school.currentAnswer.src = data.answerSrc;
        school.currentAnswer.judged = false;
      }
      return school;
    })
    console.log($scope.schools)
  })



  var toggleQuestionsModal = function(){
    $("#questionsModal").modal('toggle');
  }

  var addSchool = function(data){
    data.currentAnswer = {
          src: 'http://placedog.com/400/300'
        , judged: true
    };
    data.acceptAnswer = function(){
      this.currentAnswer.judged = true;
    };
    data.rejectAnswer = function(){
      this.currentAnswer.judged = true;
    }
    $scope.schools.push(data);
  }

  $scope._addSchool = function(){
    addSchool({
        "schoolId"  : $scope.schools.length + 1
      , "schoolName":"Pasig Catholic College"
    })
  }

  $scope.sendQuestion = function(){
    $scope.schools = $scope.schools.map(function(school){
      school.schoolName = "fuckers"
      school.currentAnswer.src = "/img/no-answer.png"
      school.currentAnswer.judged = true;
      return school;
    })
    console.log($scope.schools)
    setTimeout(function(){
      socket.emit('question',$scope.activeQuestion);  
    }, 2000)
    


  }

  $scope.selectQuestion = function(){
    toggleQuestionsModal();
  };
  
  $scope.activeQuestion = {
    used: true
  };

  $http.get('/api/quiz/'+quizId)
  .success(function(data){
    var that = this;
    console.log(data)
    $scope.inviteCode = data.inviteCode;
    $scope.quizName = data.quizName;
    $scope.quiz = data.quizCategories.map(function(category){
      category.questions = category.questions.map(function(question){
        question.used = question.used || false;
        question.select = function(){
          toggleQuestionsModal();
          $scope.activeQuestion = this;
        }
        return question;
      })
      return category;
    });

  });
   
;});

app.controller('createCtrl', function ($scope, $http, socket){
  socket.on('erika', function (data) {
    //console.log(data)
  });

  
  $scope.categories = [];
  $scope.quizname = "";
  $scope.saveQuiz = function(){
    console.log($scope.categories);
    var obj = {
        quizName : $scope.quizName
      , quizCategories : $scope.categories
    }
    console.log(obj);
    $http.post('/api/quiz/new', obj).success(function(){
        alert('Successfully uploaded Quiz')
      }).error(function(){
        alert('Failed to upload Quiz');
      })
  },
  $scope.addCategory = function(){
    $scope.categories.push({
        categoryName : ""
      , categoryHash : Date.now()
      , questions : []
      , removeCategory : function(){
            for (var i = 0; i < $scope.categories.length; i++){
              if ($scope.categories[i].categoryHash == this.categoryHash){
                $scope.categories.splice(i,1);
                break;
              }
            }
      }
      , addQuestion : function(){
        this.questions.push({
            categoryHash : this.categoryHash
          , questionHash : Date.now()
          , questionText : ""
          , answerText   : ""
          , removeQuestion : function(){
            for (var i = 0; i < $scope.categories.length; i++){
              if ($scope.categories[i].categoryHash == this.categoryHash){
                for (var j = 0; j < $scope.categories[i].questions.length; j++){
                  if ($scope.categories[i].questions[j].questionHash == this.questionHash){
                    $scope.categories[i].questions.splice(j,1);
                    break;
                  }
                }
                break;
              }
            }
          }
        })

      }
    })
  }
  
   
;});



app.controller('indexCtrl', function ($scope, $http){
  

  
   
;});
