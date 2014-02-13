var sockets = [];

var unassignedSockets = [];

var quizmaster = [];
var schools = [];

module.exports = function (socket, s2) {
  
  console.log("connection from")
  console.log(socket.id);
  if (unassignedSockets.indexOf(socket.id) == -1){
    unassignedSockets.push(socket.id);    
  }


  socket.on('identify', function(data, s3){
    console.log(socket.id)
    console.log(data, s3)
    if (data.identity == "quizmaster"){
      quizmaster.push({
        id: socket.id
      })
    };
    unassignedSockets = unassignedSockets.filter(function(a){return a!= socket.id});
  })

  socket.on('join', function(data){
    console.log(data);
    socket.emit('new-school',data)
  })

  socket.on('question', function(data){
    console.log("NEW QUESTION!!!!!")
    console.log(data);
  });
     

  // setInterval(function () {
  //   socket.emit('erika', {
  //     time: (new Date()).toString()
  //   });
  // }, 1000);
};