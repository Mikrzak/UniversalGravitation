canvas = document.getElementById("canvas");
ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

var bodies = [], stars = [], drawInterval, screenX = 0, screenY = 0, zoom = 1, relativeX = canvas.width / 2, relativeY = canvas.height / 2;

const G = 1; // gravity constant
const trailLen = 5000; // maximum number of position records in body's trail
const zoomStep = 0.05; // also minimum zoom
const starAmount = 2000; // total number of stars

class star{

    constructor(x,y,r){
        this.x = x;
        this.y = y;
        this.r = r;
        this.x0 = this.x;
        this.y0 = this.y;
    }

    display(){

        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc((this.x - screenX - canvas.width/2) * zoom + canvas.width/2,(this.y - screenY - canvas.height/2) * zoom + canvas.height/2,this.r * zoom, 0, 2 * Math.PI);
        ctx.strokeStyle = "white";
        ctx.fillStyle = `rgb(255,255,255)`;
        ctx.fill();
        ctx.stroke();
    }

    update(generateRandom = false){
        if(generateRandom){
            this.x0 = parseInt(Math.random() * 2 * canvas.width / zoomStep) - canvas.width / zoomStep;
            this.y0 = parseInt(Math.random() * 2 * canvas.height / zoomStep) - canvas.height / zoomStep;
        }
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

        var dt = 1; // simulation is too fast for this (startTime - performance.now()) / 1000;

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
        if(this.trail[0].length >= trailLen){
            this.trail[0] = this.trail[0].slice(1);
            this.trail[1] = this.trail[1].slice(1);
        }
    }
}

var b = null, x = null, y = null, rx = null, ry = null, r = null, vx = null, vy = null;
var mouseX = null, mouseY = null;
var bodyCreated = false, startedBodyCreation = false;

document.addEventListener("click",
    function addBody(){
    if(x < 0 || x > canvas.width || x == null || y < 0 || y > canvas.height || y == null){
        x = window.event.clientX;
        y = window.event.clientY;
        startedBodyCreation = true;
    } 
    else if(rx < 0 || rx > canvas.width || rx == null || ry < 0 && ry > canvas.height || ry == null){
        rx = window.event.clientX;
        ry = window.event.clientY;
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
    function() {

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
            var signX = 1,signY = 1;
            
            if(Math.abs(b.x - chosenBody.x) <= Math.abs(b.y - chosenBody.y)){
                b.v[1] = (v_*v_)/x_ * signX;
                b.v[0] = (v_*d)/x_ * signY;
            }
            else{
                b.v[0] = (v_*v_)/x_ * signX;
                b.v[1] = (v_*d)/x_ * signY;
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
        mouseX = window.event.clientX;
        mouseY = window.event.clientY;
});

var scrollDragged = false;

document.addEventListener("mousedown",
    function(event) {
        if(event.button == 1){
            scrollDragged = true;
            
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
            }

            for(var i = 0; i < stars.length; i++){
                stars[i].update(true);
            }
        }
});

document.addEventListener("mouseup",
    function(event) {
        if(event.button == 1)
            scrollDragged = false;
});

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

for(var i = 0; i < starAmount; i++)
    stars.push(new star(parseInt(Math.random() * 2 * canvas.width / zoomStep) - canvas.width / zoomStep, parseInt(Math.random() * 2 * canvas.height / zoomStep) - canvas.height / zoomStep , 5));


function draw(){

    var startTime = performance.now();

    ctx.fillStyle = `rgb(0,0,50)`;
    ctx.fillRect(0,0,canvas.width,canvas.height);

    for(var i = 0; i < stars.length; i++){
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

    if(relativeX != canvas.width / 2 && relativeY != canvas.height / 2){
        screenX = relativeBody.x - canvas.width / 2;
        screenY = relativeBody.y - canvas.height / 2;

        for(var i = 0; i < stars.length; i++){
            stars[i].update(false);
        }
    }

    //console.log(1 / ((performance.now() - startTime) / 1000))
}

drawInterval = setInterval(draw);
