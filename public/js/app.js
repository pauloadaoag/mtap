app = angular.module('mtap-quizmaster', ['ngRoute'])

app.factory('socket', function ($rootScope) {
  var socket = io.connect();

  socket.on('connect', function(){
    socket.emit('identify', {"identity":"quizmaster"})
  })
  return {
    socket: socket,
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
      when('/draw', {
        templateUrl: '/templates/draw.html',
        controller: 'drawCtrl'
      }).
      when('/create', {
        templateUrl: '/templates/create.html',
        controller: 'createCtrl'
      }).
      otherwise({
        redirectTo: '/'
      });
}]);



app.controller('drawCtrl', function ($scope, $http, $routeParams, socket){
  paper.install(window);

  paper.setup('myCanvas');
    // Create a simple drawing tool:
  var tool = new Tool();
  tool.minDistance = 5;
  tool.maxDistance = 15;

  var external_paths = {};
  var start = {};
  var path = {};

  // Define a mousedown and mousedrag handler
  tool.onMouseDown = function(event) {
    path = new Path();
    path.strokeColor = 'black';
    path.add(event.point);
    start.start = event.point;
  }

  tool.onMouseDrag = function(event) {

    var uid = socket.socket.sessionid;
    
    var top = new Point({
        x: event.middlePoint.x
      , y: event.middlePoint.y
    })  
    var bottom = new Point({
        x: event.middlePoint.x
      , y: event.middlePoint.y
    })  
    

    path.add(top);
    path.insert(0, bottom);
    path.smooth();

    var dataToEmit = {"top": top, "bottom": bottom};
    socket.emit('draw:progress', {"uid":uid, start:start, dataToEmit: dataToEmit});
  }

  tool.onMouseUp = function(event){
    path.add(event.point);
    path.closed = false;
    path.smooth();
    var end = event.point;
    var dataToEmit = {end:end};
    var uid = socket.socket.sessionid;
    socket.emit('draw:end', dataToEmit); 
  }


  socket.on('draw:progress', function(data){
    var artist = data.artist;
    var uid = socket.socket.sessionid;
    if(true){   
      var thispath = external_paths[artist];
      if( !thispath ){
        external_paths[artist] = new paper.Path();
        thispath = external_paths[artist];
        thispath.fillColor = 'black';
        var thisstart = new Point(data.start.start[1], data.start.start[2]);
        thispath.add(thisstart);
      }
      else{
        var thistop = new Point(data.dataToEmit.top[1], data.dataToEmit.top[2]);
        var thisbottom = new Point(data.dataToEmit.bottom[1], data.dataToEmit.bottom[2]);
        thispath.add(thistop);
        thispath.insert(0, thisbottom);
        thispath.smooth();
      }
    }
  })


  socket.on('draw:end', function(data){
    var artist = data.artist;
    var uid = socket.socket.sessionid;
    console.log("end");
    console.log(data);
    if(true){
      var thispath = external_paths[artist];
      console.log(thispath)
      if( thispath ){
        var thisend = new Point(data.end[1], data.end[2]);
        thispath.add(thisend);
        thispath.closed = false;
        thispath.smooth();
        var path = new paper.Path();
        for (var i = 0; i < thispath._segments.length; i++){
          path.add(thispath._segments[i])
        }
        path.strokeColor = 'black';
        paper.view.draw();
        external_paths[artist] = false;
      }
    }
  });



})  

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
      , categoryTime : 60
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
