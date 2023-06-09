canvas = document.getElementById("canvas");
ctx = canvas.getContext("2d");
canvas.width = window.screen.width;
canvas.height = window.screen.height;

var bodies = [], drawInterval;

const G = 1; // gravity constant
const trailLen = 30000; // maximum number of position records in body's trail

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
        ctx.arc(this.x,this.y,this.r, 0, 2 * Math.PI);
        ctx.strokeStyle = "white";
        ctx.fillStyle = `rgb(${this.color[0]},${this.color[1]},${this.color[2]})`;
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "white";
        ctx.font = "bold " + this.r/2 +"px serif";
        ctx.fillText(this.m,this.x - this.r / 2,this.y + this.r / 6);

        ctx.strokeStyle = `rgb(${this.color[0]},${this.color[1]},${this.color[2]})`;  
        for(var i = 0; i < this.trail[0].length - 1; i++){
            ctx.beginPath();
            ctx.moveTo(this.trail[0][i],this.trail[1][i]);
            ctx.lineTo(this.trail[0][i + 1],this.trail[1][i + 1])
            ctx.stroke();
        }
    }

    calculate(){

        var startTime = performance.now();
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

document.addEventListener("click",
    function addBody(){
    if(x < 0 || x > canvas.width || x == null || y < 0 || y > canvas.height || y == null){
        x = mouseX;
        y = mouseY;
    }
    else if(rx < 0 || rx > canvas.width || rx == null || ry < 0 && ry > canvas.height || ry == null){
        rx = window.event.clientX;
        ry = window.event.clientY;
        r = parseInt(Math.sqrt((rx - x) * (rx - x) + (ry - y) * (ry - y)));
        if(r < 1){
            b = null;
            x = null;
            y = null;
            rx = null;
            ry = null;
            r = null;
            vx = null;
            vy = null;
            return; 
        }
        b = new body(x,y,r,parseInt(Math.PI * r * r), [0,0]);
    }
    else if(vx < 0 || vx > canvas.width || vx == null || vy < 0 && vy > canvas.height || vy == null){
        vx = window.event.clientX;
        vy = window.event.clientY;
        b.v[0] = (vx - x) / 100;
        b.v[1] = (vy - y) / 100;
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
    }

});

document.addEventListener("mousemove",
    function() {
        mouseX = window.event.clientX;
        mouseY = window.event.clientY;
});

function drawPhantomSphere(){ // it actually does 2 things: draws the sphere and the velocity vector (bad habit)

    if(rx >= 0 && rx < canvas.width && rx != null && ry >= 0 && ry < canvas.height && ry != null){   
        b.display();
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x,y);
        ctx.strokeStyle = "red";
        ctx.lineTo(mouseX, mouseY);
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

//bodies = [new body(canvas.width/2,canvas.height/2,50,parseInt(Math.PI * 50 * 50),[0,0])];

for(var i = 0; i < 0; i++)
    bodies.push(new body(parseInt(Math.random() * canvas.width),parseInt(Math.random() * canvas.height),10,parseInt(Math.PI * 10 * 10),[1,0]));

function draw(){

    ctx.fillStyle = `rgb(0,0,50)`;
    ctx.fillRect(0,0,canvas.width,canvas.height);
    
    for(var i = 0; i < bodies.length; i++){
        bodies[i].display();
        bodies[i].calculate();
        bodies[i].update();
        if(bodies[i].r == 0)
            bodies.splice(i,1);
    }
    drawPhantomSphere();
}

drawInterval = setInterval(draw);
