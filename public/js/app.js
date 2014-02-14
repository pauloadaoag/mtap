app = angular.module('mtap-quizmaster', ['ngRoute'])

app.factory('socket', function ($rootScope) {
  var socket = io.connect();


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
  socket.on('connect', function(){
    socket.emit('identify', {"identity":"school", "schoolName":"Philippine Science"})
  })
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
})  

app.controller('quizCtrl', function ($scope, $http, $routeParams, socket){
  var quizId = $routeParams.quizId;
  
  socket.on('connect', function(){
    socket.emit('identify', {"identity":"quizmaster"})
  })
  $scope.schools = [];
  $scope.timer = 0;
  $scope.allowEntry = false;
  var external_paths = {};
  var start = {};
  var path = {};



  socket.on('new-school', function(data){
    console.log("new school joined")
    addSchool(data);
  })

  socket.on('answer', function(data){
    $scope.schools = $scope.schools.map(function(school){
      if (school.schoolId == parseInt(data.schoolId)){
        school.currentAnswer.src = data.answerSrc;
        school.currentAnswer.judged = false;
      }
      return school;
    })
    console.log($scope.schools)
  });

  socket.on('clear', function(data){
    var schoolId = data.schoolId;
    for (var i = 0; i < $scope.schools.length; i++){
      if ($scope.schools[i].schoolId == artist){
        school = $scope.schools[i];
        school.clearSlate();
        break;
      }
    }
  })


  socket.on('draw:progress', function(data){
    //if (!$scope.allowEntry) return;
    var artist = data.artist;
    var uid = socket.socket.sessionid;
    
    var school = {};
    for (var i = 0; i < $scope.schools.length; i++){
      if ($scope.schools[i].schoolId == artist){
        school = $scope.schools[i];
        break;
      }
    }
      
    if (!school) return;
    if(school.path == null){
      school.createPath(data);
      //school.updatePath(data);
    }
    else{
      school.updatePath(data);      
    }
  
  })


  socket.on('draw:end', function(data){
    //if (!$scope.allowEntry) return;
    var artist = data.artist;
    var uid = socket.socket.sessionid;
    var school = {};
    for (var i = 0; i < $scope.schools.length; i++){
      if ($scope.schools[i].schoolId == artist){
        school = $scope.schools[i];
        break;
      }
    }
    school.endPath(data);
  });

  var toggleQuestionsModal = function(){
    $("#questionsModal").modal('toggle');
  }

  var addSchool = function(data){
    data.paper = new paper.PaperScope();
    data.path = null;
    data.canvasCreated = false;
    data.points = 0;
    data.updatePath = function(data){
      console.log(this.schoolId)
      var thistop = new this.paper.Point(data.dataToEmit.top[1]/2, data.dataToEmit.top[2]/2);
      var thisbottom = new this.paper.Point(data.dataToEmit.bottom[1]/2, data.dataToEmit.bottom[2]/2);
      if (this.path == null);
      this.path.add(thistop);
      this.path.insert(0, thisbottom);
      this.path.smooth();
    };
    data.clearSlate = function(){
     this.paper.setup('canvas'+this.schoolId); 
     this.canvasCreated = true; 
    }
    data.endPath = function(data){
      console.log("end " + this.schoolId);
      if( this.path ){
        if (data){
          var thisend = new this.paper.Point((data.end[1])/2, (data.end[2])/2);
          this.path.add(thisend);  
        }
        
        this.path.closed = false;
        this.path.smooth();
        var _path = new this.paper.Path();
        for (var i = 0; i < this.path._segments.length; i++){
          _path.add(this.path._segments[i])
        }
        _path.strokeColor = 'black';
        //_path.scale(0.5, _path.bounds.topLeft);
        paper.view.draw();
        this.path = null;
      }
    }
    data.createPath = function(data){
      if (!this.canvasCreated) { this.paper.setup('canvas'+this.schoolId); this.canvasCreated = true; }
      this.path = new this.paper.Path();
      this.path.fillColor = 'black';
      var thisstart = new this.paper.Point(data.start.start[1]/2, data.start.start[2]/2);
      this.path.add(thisstart);

    }
    data.drawData = function(path){
      var _path = new this.paper.Path();
      for (var i = 0; i < path._segments.length; i++){
        _path.add(path._segments[i])
      }
      this.paper.view.draw();
    };
    data.currentAnswer = {
      judged: true
    };
    data.acceptAnswer = function(){      
      this.points += $scope.activeQuestion.points;
      this.currentAnswer.judged = true;
    };
    data.rejectAnswer = function(){
      this.currentAnswer.judged = true;
    }
    $scope.schools.push(data);
    console.log($scope.schools);
  }

  $scope.sendQuestion = function(){
    $scope.schools = $scope.schools.map(function(school){
      school.currentAnswer.src = "/img/no-answer.png"
      school.currentAnswer.judged = true;
      return school;
    })
    var toSend = {
        questionText: $scope.activeQuestion.questionText
     ,  points : $scope.activeQuestion.points
     ,  time   : $scope.activeQuestion.time
    }
    
    socket.emit('new-question',toSend);
    
  }

  $scope.startTimer = function(){
    $scope.activeQuestion.used = true;
    $scope.timer = $scope.activeQuestion.time;
    
    socket.emit('startTimer');
    $scope.allowEntry = true;
    //setTimeout(decrementTimer, 1000);
    $scope.allowJudging();
    $scope.clearCanvases();
  }

  var decrementTimer = function(){

    if ($scope.timer > 0) {
      $scope.timer--;
      $scope.$apply();
      setTimeout(decrementTimer, 1000);
    }
    else{
      for (var i = 0; i < $scope.schools.length; i++){
        $scope.schools[i].endPath(null);
      }
      $scope.allowEntry = false;
    }
  }

  $scope.clearCanvases = function(){
    for(var i = 0; i < $scope.schools.length; i++){
      $scope.schools[i].clearSlate();
    }
  }


  $scope.allowJudging = function(){
    for(var i = 0; i < $scope.schools.length; i++){
      $scope.schools[i].currentAnswer.judged = false;
    }
  }
  $scope.disallowJudging = function(){
    for(var i = 0; i < $scope.schools.length; i++){
      $scope.schools[i].currentAnswer.judged = true;
    }
  }

  $scope.selectQuestion = function(){
    toggleQuestionsModal();
  };
  
  $scope.activeQuestion = {
    used: true
  };

  $http.get('/mapi/quiz/'+quizId)
  .success(function(data){
    var that = this;
    $scope.inviteCode = data.inviteCode;
    $scope.quizName = data.quizName;
    $scope.quiz = data.quizCategories.map(function(category){
      var secs = category.categoryTime;
      var points = category.categoryPoints;
      var categoryId = category._id;
      category.questions = category.questions.map(function(question){
        question.used = question.used || false;
        question.points = points;
        question.time = secs;
        question.categoryId = categoryId;
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
    $http.post('/mapi/quiz/', {"obj":obj}).success(function(){
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

// window.onbeforeunload = function() {
//     return 'A quiz is currently ongoing!!!';
// }
