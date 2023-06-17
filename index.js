var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");

var objectInfoText = document.getElementById("objectInfo");
var infoDiv = document.getElementById("infoDiv");
var innerInfoDiv = document.getElementById("innerInfoDiv");
var simulationSpeedSlider = document.getElementById("simulationSpeed");
var showTrailCheckbox = document.getElementById("showTrail");
var lockFpsCheckbox = document.getElementById("lockFps");
var showStarsCheckbox = document.getElementById("showStars");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
var rect = infoDiv.getBoundingClientRect(); //https://stackoverflow.com/questions/442404/retrieve-the-position-x-y-of-an-html-element
// rect.bottom = 1200;
// rect.top = 800;

var bodies = [], stars = [], drawInterval, screenX = 0, screenY = 0, zoom = 1, relativeX = canvas.width / 2, relativeY = canvas.height / 2, fps;

const G = 1; // gravity constant
const trailLen = 5000; // maximum number of position records in body's trail
const zoomStep = 0.03; // zooming step, also minimum zoom
const starAmount = 2000; // total number of stars
const starSize = 5; // star radius

class star{

    constructor(x,y,r){
        this.x = x;
        this.y = y;
        this.r = r;
        this.x0 = this.x;
        this.y0 = this.y;
        this.visible = true;
        //console.log(this.x0 + screenX);
    }

    display(){

        if(!this.visible) return;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc((this.x - screenX - canvas.width/2) * zoom + canvas.width/2,(this.y - screenY - canvas.height/2) * zoom + canvas.height/2,this.r * zoom, 0, 2 * Math.PI);
        ctx.strokeStyle = "white";
        ctx.fillStyle = `rgb(255,255,255)`;
        ctx.fill();
        ctx.stroke();
    }

    update(){

        this.x0 = parseInt(Math.random() * 2 * canvas.width / zoomStep) - canvas.width / zoomStep;
        this.y0 = parseInt(Math.random() * 2 * canvas.height / zoomStep) - canvas.height / zoomStep;
        this.x = this.x0 + screenX;
        this.y = this.y0 + screenY;
    }
}

class body{

    constructor(x,y,r,m,v){
        this.x = x;
        this.y = y;
        this.r = r;
        this.m = m;
        this.color = [parseInt(Math.random() * 255), parseInt(Math.random() * 255), parseInt(Math.random() * 255)];
        this.v = v;
        this.nextx = x;
        this.nexty = y;
        this.nextm = m;
        this.nextr = r;
        this.nextv = [v[0],v[1]];
        this.a = [0,0];

        this.trail = [[],[]];
    }

    display(){

        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc((this.x - screenX - canvas.width / 2) * zoom + canvas.width / 2,(this.y - screenY - canvas.height / 2) * zoom + canvas.height / 2,this.r * zoom, 0, 2 * Math.PI);
        ctx.strokeStyle = "white";
        ctx.fillStyle = `rgb(${this.color[0]},${this.color[1]},${this.color[2]})`;
        ctx.fill();
        ctx.stroke();
        // ctx.fillStyle = "white";
        // ctx.font = "bold " + this.r/2 +"px serif";
        // ctx.fillText(this.m,this.x - this.r / 2,this.y + this.r / 6);

        if(!showTrailCheckbox.checked) return;

        ctx.strokeStyle = `rgb(${this.color[0]},${this.color[1]},${this.color[2]})`;
        for(var i = 0; i < this.trail[0].length - 1; i++){
            ctx.beginPath();
            ctx.moveTo((this.trail[0][i] - screenX - canvas.width / 2) * zoom + canvas.width / 2,(this.trail[1][i] - screenY - canvas.height / 2) * zoom + canvas.height / 2);
            ctx.lineTo((this.trail[0][i + 1] - screenX - canvas.width / 2) * zoom + canvas.width / 2,(this.trail[1][i + 1] - screenY - canvas.height / 2) * zoom + canvas.height / 2);
            ctx.stroke();
        }
    }

    calculate(){

        //var startTime = performance.now();
        var Fv = [0,0], prevFv = [0,0];  

        for(var i = 0; i < bodies.length; i++){

            if(bodies[i].x == this.x && bodies[i].y == this.y) continue;

            var v = [bodies[i].x - this.x, bodies[i].y - this.y]; // vector between this and other body
            var r = Math.sqrt(v[0] * v[0] + v[1] * v[1]); // vector length (distance beetwen the bodies)
            var uv = [v[0] / r, v[1] / r]; // unit vector of v
            Fv = [uv[0] * (G * this.m * bodies[i].m) / (r*r), uv[1] * (G * this.m * bodies[i].m) / (r*r)]; // force vector
            Fv = [Fv[0] + prevFv[0], Fv[1] + prevFv[1]]; // adding force vectors
            prevFv = Fv;
        }

        var dt = simulationSpeedSlider.value; // simulation is too fast for this (startTime - performance.now()) / 1000;

        this.a = [Fv[0]/this.m,Fv[1]/this.m]; // acceleration vector
        this.nextv = [this.v[0] + this.a[0] * dt, this.v[1] + this.a[1] * dt]; // velocity vector

        var found = false;
        var collidingBody;

        for(var i = 0; i < bodies.length; i++){ // searching for collision
            if(bodies[i].x == this.x && bodies[i].y == this.y) continue;
            if(Math.sqrt((bodies[i].x - this.x) * (bodies[i].x - this.x) + (bodies[i].y - this.y) * (bodies[i].y - this.y)) <= bodies[i].r + this.r){ // || Math.sqrt((bodies[i].x - (this.x + this.v[0] * dt)) * (bodies[i].x - (this.x + this.v[0] * dt)) + (bodies[i].y - (this.y + this.v[1] * dt)) * (bodies[i].y - (this.y + this.v[1] * dt))) <= bodies[i].r + this.r
                collidingBody = bodies[i];
                found = true;
                break;
            }
        }

        if(found){ // conservation of momentum and mass
            if(this.m >= collidingBody.m){
                this.nextm = parseInt(collidingBody.m + this.m);
                this.nextr = collidingBody.r + this.r;
                collidingBody.nextr = 0;
                this.nextv = [ (this.m * this.v[0] + collidingBody.m * collidingBody.v[0])/(this.m + collidingBody.m), (this.m * this.v[1] + collidingBody.m * collidingBody.v[1])/(this.m + collidingBody.m) ];
            }
        }

        this.nextx += this.nextv[0] * dt;
        this.nexty += this.nextv[1] * dt;
    }

    update(){
        
        this.x = this.nextx;
        this.y = this.nexty;
        this.v[0] = this.nextv[0];
        this.v[1] = this.nextv[1];
        this.m = this.nextm;
        this.r = this.nextr;
        this.trail[0].push(this.x);
        this.trail[1].push(this.y);

        if(!showTrailCheckbox.checked) return;

        if(this.trail[0].length >= trailLen){
            this.trail[0] = this.trail[0].slice(1);
            this.trail[1] = this.trail[1].slice(1);
        }
    }
}

var b = null, x = null, y = null, rx = null, ry = null, r = null, vx = null, vy = null;
var mouseX = null, mouseY = null;
var bodyCreated = false, bodyCanBeCreated = true;

document.addEventListener("mouseup",
    function addBody(){

        if(!bodyCanBeCreated || event.button == 1 || event.button == 2) return;
        if(x < 0 || x > canvas.width || x == null || y < 0 || y > canvas.height || y == null){

            if(window.event.clientX >= 0 && window.event.clientX <= rect.right && window.event.clientY >= rect.top && window.event.clientY <= rect.bottom)
                return;
            // if(window.event.clientX == 0)
            //     return;
            x = window.event.clientX;
            y = window.event.clientY;
            startedBodyCreation = true;
        } 
        else if(rx < 0 || rx > canvas.width || rx == null || ry < 0 && ry > canvas.height || ry == null){

            if(window.event.clientX >= 0 && window.event.clientX <= rect.right && window.event.clientY >= rect.top && window.event.clientY <= rect.bottom)
                return;
            rx = window.event.clientX;
            ry = window.event.clientY;
            //  console.log(x,y,rx,ry);
            //console.log(screenX,screenY,(screenX / (screenX * zoom)));
            posX = ((x + screenX * zoom - canvas.width/2) / zoom + canvas.width/2);
            posY = ((y + screenY * zoom - canvas.height/2) / zoom + canvas.height/2);
            mouseXWorld = ((window.event.clientX + screenX * zoom - canvas.width/2) / zoom + canvas.width/2);
            mouseYWorld = ((window.event.clientY + screenY * zoom - canvas.height/2) / zoom + canvas.height/2);
            r = parseInt(Math.sqrt((mouseXWorld - posX) * (mouseXWorld - posX) + (mouseYWorld - posY) * (mouseYWorld - posY)));

            if(r < 1){
                b = null;
                x = null;
                y = null;
                rx = null;
                ry = null;
                r = null;
                vx = null;
                vy = null;
                bodyCreated = false;
                return; 
            }
            b = new body(posX,posY,r,parseInt(Math.PI * r * r), [0,0]);
            startedBodyCreation = false;
            bodyCreated = true;
        }
        else if(vx < 0 || vx > canvas.width || vx == null || vy < 0 && vy > canvas.height || vy == null){
            if(window.event.clientX >= 0 && window.event.clientX <= rect.right && window.event.clientY >= rect.top && window.event.clientY <= rect.bottom)
                return;
            vx = ((window.event.clientX + screenX * zoom - canvas.width/2) / zoom + canvas.width/2);
            vy = ((window.event.clientY + screenY * zoom - canvas.height/2) / zoom + canvas.height/2);
            b.v[0] = (vx - posX) / 100;
            b.v[1] = (vy - posY) / 100;
            if(Math.abs(b.v[0]) < 0.1) b.v[0] = 0;
            if(Math.abs(b.v[1]) < 0.1) b.v[1] = 0;
            bodies.push(b);
            b = null;
            x = null;
            y = null;
            rx = null;
            ry = null;
            r = null;
            vx = null;
            vy = null;
            bodyCreated = false;
        }
});

document.addEventListener("contextmenu",
    function(event) {
        event.preventDefault();
        if(startedBodyCreation){
            b = null;
            x = null;
            y = null;
            rx = null;
            ry = null;
            r = null;
            vx = null;
            vy = null;
            bodyCreated = false;
        }
});

document.addEventListener("contextmenu",
    function(event) {
        event.preventDefault();
        if(bodyCreated){

            posX_ = ((window.event.clientX + screenX * zoom - canvas.width/2) / zoom + canvas.width/2);
            posY_ = ((window.event.clientY + screenY * zoom - canvas.height/2) / zoom + canvas.height/2);

            var found = false;
            var chosenBody; 

            for(var i = 0; i < bodies.length; i++){
                if(bodies[i].x - bodies[i].r <= posX_ && bodies[i].x + bodies[i].r >= posX_ && bodies[i].y - bodies[i].r <= posY_ && bodies[i].y + bodies[i].r >= posY_){
                    chosenBody = bodies[i];
                    found = true;
                    break;
                }
            }

            if(!found)
                return;
            
            var x1 = canvas.width/2;
            var y1 = canvas.height/2 + 200;
            var d = Math.sqrt((b.x - chosenBody.x) * (b.x - chosenBody.x) + (b.y - chosenBody.y) * (b.y - chosenBody.y));
            var v_ = Math.sqrt((G * chosenBody.m) / d);
            var x_ = Math.sqrt(d*d + v_*v_);
            
            if(Math.abs(b.x - chosenBody.x) <= Math.abs(b.y - chosenBody.y)){
                b.v[1] = (v_*v_)/x_;
                b.v[0] = (v_*d)/x_;
            }
            else{
                b.v[0] = (v_*v_)/x_;
                b.v[1] = (v_*d)/x_;
            }
            
            bodies.push(b);

            b = null;
            x = null;
            y = null;
            rx = null;
            ry = null;
            r = null;
            vx = null;
            vy = null;
            bodyCreated = false;
        }
});

document.addEventListener("mousemove",
    function() {
        if(window.event.clientX >= 0 && window.event.clientX <= rect.right && window.event.clientY >= rect.top && window.event.clientY <= rect.bottom)
            return;
        mouseX = window.event.clientX;
        mouseY = window.event.clientY;
});

document.addEventListener("mousedown",
    function() {
        if(window.event.clientX >= 0 && window.event.clientX <= rect.right && window.event.clientY >= rect.top && window.event.clientY <= rect.bottom)
            bodyCanBeCreated = false;
        else
            bodyCanBeCreated = true;
});

//var scrollDragged = false;

document.addEventListener("mousedown",
    function(event) {

        if(event.button == 1){

            event.preventDefault();
            //scrollDragged = true;
            
            posX_ = ((window.event.clientX + screenX * zoom - canvas.width/2) / zoom + canvas.width/2);
            posY_ = ((window.event.clientY + screenY * zoom - canvas.height/2) / zoom + canvas.height/2);

            var found = false;
            for(var i = 0; i < bodies.length; i++){
                if(bodies[i].x - bodies[i].r <= posX_ && bodies[i].x + bodies[i].r >= posX_ && bodies[i].y - bodies[i].r <= posY_ && bodies[i].y + bodies[i].r >= posY_){
                    relativeBody = bodies[i];
                    found = true;
                    break;
                }
            }

            if(found){
                relativeX = relativeBody.x;
                relativeY = relativeBody.y;
            }
            else{
                relativeX = canvas.width / 2;
                relativeY = canvas.height / 2;
                screenX += (window.event.clientX - canvas.width  / 2) / zoom;
                screenY += (window.event.clientY - canvas.height / 2) / zoom;
                objectInfoText.innerHTML = "";
            }

            for(var i = 0; i < starAmount; i++){
                stars[i].update();
            }
        }
});

// document.addEventListener("mouseup",
//     function(event) {
//         if(event.button == 1)
//             scrollDragged = false;
// });

document.addEventListener("wheel",
    function(event) {
        if(event.deltaY > 0){
            zoom -= zoomStep;
        }
        else if(event.deltaY < 0){
            zoom += zoomStep;
        }
        if(zoom < zoomStep)
            zoom = zoomStep;
});

//https://stackoverflow.com/questions/27116221/prevent-zoom-cross-browser

window.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && (e.which === 61 || e.which === 107 || e.which === 173 || e.which === 109 || e.which === 187 || e.which === 189)) {
        e.preventDefault();
    }
  }, false);
  
  document.addEventListener(
    "wheel",
    function touchHandler(e) {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    }, { passive: false } );

function drawPhantomSphere(){ // it actually does 2 things: draws the sphere and the velocity vector (bad habit)

    if(rx >= 0 && rx < canvas.width && rx != null && ry >= 0 && ry < canvas.height && ry != null){   
        b.display();
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x,y);
        ctx.strokeStyle = "red";
        ctx.lineTo(mouseX,mouseY);
        ctx.stroke();
    }
    else if(x >= 0 && x < canvas.width && x != null && y >= 0 && y < canvas.height && y != null){
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x,y,parseInt(Math.sqrt((x - mouseX) * (x - mouseX) + (y - mouseY) * (y - mouseY))), 0, 2 * Math.PI);
        ctx.strokeStyle = "white";
        ctx.fillStyle = "white";
        ctx.fill();
    }
}

//bodies.push(new body(canvas.width/2,canvas.height/2,100,parseInt(Math.PI * 100 * 100),[0,0]));

// for(var i = 0; i < 1; i++)
    // bodies.push(new body(canvas.width/2,canvas.height/2,10,parseInt(Math.PI * 10 * 10),[0,0]));
    // bodies.push(new body(canvas.width/2 + 300,canvas.height/2 + 300,10,parseInt(Math.PI * 10 * 10),[0,0]));

for(var i = 0; i < starAmount; i++)
    stars.push(new star(parseInt(Math.random() * 2 * canvas.width / zoomStep) - canvas.width / zoomStep, parseInt(Math.random() * 2 * canvas.height / zoomStep) - canvas.height / zoomStep , starSize));

function changeDrawFps(){

    drawInterval = clearInterval(drawInterval);
    if(lockFpsCheckbox.checked)
        drawInterval = setInterval(draw,16.66667)
    else
        drawInterval = setInterval(draw);
}

function toggleStars(){

    if(showStarsCheckbox.checked){
        for(var i = 0; i < starAmount; i++)
            stars[i].visible = true;
    }
    else{
        for(var i = 0; i < starAmount; i++)
            stars[i].visible = false;
    }
}

function draw(){

    var startTime = performance.now();

    ctx.fillStyle = `rgb(0,0,50)`;
    ctx.fillRect(0,0,canvas.width,canvas.height);

    for(var i = 0; i < starAmount; i++){
        stars[i].display();
    }
    
    for(var i = 0; i < bodies.length; i++){
        bodies[i].display();
        bodies[i].calculate();
        bodies[i].update();
        if(bodies[i].r == 0)
            bodies.splice(i,1);
    }

    drawPhantomSphere();

    //if(scrollDragged){
        // screenX = mouseX - canvas.width /2 ;
        // screenY = mouseY - canvas.height /2;
    //}

    if(relativeX != canvas.width / 2 && relativeY != canvas.height / 2){

        screenX = relativeBody.x - canvas.width / 2;
        screenY = relativeBody.y - canvas.height / 2;
        rect = innerInfoDiv.getBoundingClientRect();

        if(showStarsCheckbox.checked){
            if(simulationSpeedSlider.value != 0){
                if(simulationSpeedSlider.value <= 9){
                    for(var i = 0; i < starAmount / (33 - Math.pow(simulationSpeedSlider.value, 1.5)); i++){
                        stars[i].visible = true;
                        stars[i].update();
                    }
                    for(var i = parseInt(starAmount / (33 - Math.pow(simulationSpeedSlider.value, 1.5))); i < starAmount; i++){
                        stars[i].visible = false;
                    }
                }
                else{
                    for(var i = 0; i < starAmount; i++){
                        stars[i].visible = true;
                        stars[i].update();
                    }
                }
            }
        }

        fps = parseInt(1 / ((performance.now() - startTime) / 1000));
        if(lockFpsCheckbox.checked && fps > 60)
            fps = 60;

        //https://webmasters.stackexchange.com/questions/39777/mathml-html-symbol-for-mathematical-vector
        objectInfoText.innerHTML = "<math xmlns='http://www.w3.org/1998/Math/MathML'><mover><mi>v</mi><mo mathsize='50%'>&rarr;</mo></mover></math> = [" + parseInt(relativeBody.v[0] * 1000) / 1000 + ", " + parseInt(relativeBody.v[1] * 1000) / 1000 + "]" + '\n' +
                                   "<math xmlns='http://www.w3.org/1998/Math/MathML'><mover><mi>a</mi><mo mathsize='50%'>&rarr;</mo></mover></math> = [" + parseInt(relativeBody.a[0] * 1000) / 1000 + ", " + parseInt(relativeBody.a[1] * 1000) / 1000 + "]" + '\n' +
                                   "<math xmlns='http://www.w3.org/1998/Math/MathML'><mover><mi>F</mi><mo mathsize='50%'>&rarr;</mo></mover></math> = [" + parseInt(relativeBody.a[0] * relativeBody.m * 1000) / 1000 + ", " + parseInt(relativeBody.a[1] * relativeBody.m * 1000) / 1000 + "]" + '\n' +
                                   "m = " + relativeBody.m + '\n' +
                                   "r = " + relativeBody.r + '\n' +
                                   "pos: [" + parseInt(relativeBody.x * 100) / 100 + ", " + parseInt(relativeBody.y * 100) / 100 + "]" + '\n' +
                                   "fps: " + fps;

    }
    else
        rect = infoDiv.getBoundingClientRect();

    //console.log(relativeX,relativeY);
}

drawInterval = setInterval(draw);
