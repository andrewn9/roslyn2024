import './style.css'
import { Engine, Bodies, Composite, IChamferableBodyDefinition, Body, Vector, World, Events} from 'matter-js'
import * as PIXI from 'pixi.js'
import loadedMap from './map.json'
import { Howl } from 'howler';

const bodies: [PIXI.Sprite, Body][] = [];
var logo: PIXI.Sprite;

let mode = 0;

let selected: Body|undefined;
var canjump = true;

const sounds = {
    jump: new Howl({
        src: ['spring.wav'],
        volume: 0.25
    }),
}

function createBox(x: number, y: number, w: number, h: number, source: PIXI.TextureSource, options?: IChamferableBodyDefinition) {
    const body = Bodies.rectangle(x, y, w, h, options);

    const texture = PIXI.Texture.from(source);
    
    const sprite = new PIXI.Sprite(texture);
    sprite.height = h * camera.scale;
    sprite.width = w * camera.scale;
    sprite.x = x;
    sprite.y = y;
    sprite.anchor.x = 0.5;
    sprite.anchor.y = 0.5;

    if (source == "logo.png") {
        logo = sprite;
    }

    app.stage.addChild(sprite);
    sprite.eventMode = "dynamic";

    sprite.on("click", () => {
        selected = body;
        console.log(sprite)
        if (mode === 3) {
            const index = bodies.indexOf([sprite, body]);
            if (index > -1) { // only splice array when item is found
                bodies.splice(index, 1); // 2nd parameter means remove one item only
            }

            app.stage.removeChild(sprite);
            World.remove(engine.world, selected);
        }
    });

    Composite.add(engine.world, body);
    bodies.push([sprite, body]);

    return body;
}

function createBox2(x: number, y: number, source: PIXI.TextureSource, options?: IChamferableBodyDefinition) {
    const texture = PIXI.Texture.from(source);
    
    const sprite = new PIXI.Sprite(texture);
    sprite.x = x;
    sprite.y = y;
    sprite.anchor.x = 0.5;
    sprite.anchor.y = 0.78;

    const body = Bodies.rectangle(x, y, sprite.width, sprite.height, options);

    app.stage.addChild(sprite);
    Composite.add(engine.world, body);
    bodies.push([sprite, body]);

    return body;
}


const maxF = 4;
const maxDrag = 0.4*window.innerHeight;
var compression = 0;
var spring_force: Vector;

window.addEventListener("auxclick", (e) => {
    if (e.button === 1) {
        e.preventDefault();
        let x = e.clientX, y = e.clientY;

        x -= app.view.width/2;
        y -= app.view.height/2;
        x /= camera.scale;
        y /= camera.scale;
        x += camera.x;
        y += camera.y;

        Body.setPosition(player, {x: x, y: y});
    }
});

window.addEventListener("pointerdown", (e) => {
    let start = {x: e.clientX, y: e.clientY};
    const sprite = new PIXI.Sprite(PIXI.Texture.from("gray.png"));
    app.stage.addChild(sprite);
    sprite.height = 0;
    
    function pointermove(ev: PointerEvent) {
        if (e.pointerId !== ev.pointerId) return;

        if (canjump)
        {
            let current = {x: ev.clientX, y: ev.clientY};
            let wpos = Vector.add(player.position, Vector.sub(current,start));
            console.log(wpos);
            let move = Vector.normalise(Vector.sub(wpos, player.position));
            let mag = Math.min(Vector.magnitudeSquared(Vector.sub(wpos, player.position)) / maxDrag, 1);
            compression = mag;
            spring_force = Vector.mult(move, mag * maxF);
            spring_force.x *= -0.5;
            spring_force.y *= -1;
            
            if (logo) {
                logo.height = 50/(mag+1);
                // logo.anchor.y = 1;
            }
        }

        if (mode === 1) {
            sprite.x = Math.min(e.clientX, ev.clientX);
            sprite.y = Math.min(e.clientY, ev.clientY);
            sprite.width = Math.abs(ev.clientX - e.clientX);
            sprite.height = Math.abs(ev.clientY - e.clientY);
        } else if (mode === 2 && selected) {
            Body.setAngle(selected, Math.atan2(ev.clientY - (selected.position.y - camera.y) * camera.scale - app.view.height/2, ev.clientX - (selected.position.x - camera.x) * camera.scale - app.view.width/2));
            // selected.angle = ;
        }

    }

    function pointerup(ev: PointerEvent) {
        if (e.pointerId !== ev.pointerId) return;
        let x = Math.min(e.clientX, ev.clientX), y = Math.min(e.clientY, ev.clientY), w = Math.abs(ev.clientX-e.clientX), h = Math.abs(ev.clientY-e.clientY);
        
        x += w/2;
        y += h/2;

        x -= app.view.width/2;
        y -= app.view.height/2;
        x /= camera.scale;
        y /= camera.scale;
        w /= camera.scale;
        h /=camera.scale;
        x += camera.x;
        y += camera.y;

        if (logo) {
            logo.height = 50;
        }
        if (mode === 0 && spring_force && Vector.magnitudeSquared(spring_force) > 0 && canjump) {
            Body.applyForce(player, player.position, spring_force);
            const id = sounds.jump.play();
            sounds.jump.rate(Math.random()*0.5+1, id);
            canjump = false;
        } else if (mode === 1) {
            createBox(x, y, w, h, "gray.png", { isStatic: true });
        }

        app.stage.removeChild(sprite);
        window.removeEventListener("pointerup", pointerup);
        window.removeEventListener("pointermove", pointermove);
    }

    window.addEventListener("pointermove", pointermove);
    window.addEventListener("pointerup", pointerup);
});

const camera = {
    x: 0,
    y: 0,
    scale: 5,
};


const app = new PIXI.Application({ resizeTo: window });
document.body.appendChild(app.view as HTMLCanvasElement);

const engine = Engine.create();
engine.timing.timeScale = 0.8;

const bg_object = createBox2(0,0, "v1.png", { isStatic: true, 
    collisionFilter: {
        'group': -1,
        'category': 2,
        'mask': 0,
    }
});

const player = createBox(-120, 120, 10, 10, "logo.png", {density: 1, frictionStatic: 2,friction: 1, restitution: 0.2});

// createBox(0, 10, 100, 10, "gray.png", { isStatic: true });

let time: number;
function loop(t) {
    const dt = Math.min(t-time, 100);
    time = t;
    // console.log(dt);
    requestAnimationFrame(loop)
    Engine.update(engine, dt || 16);
}

requestAnimationFrame(loop)

var won = false;
app.ticker.add((dt) => {
    
    camera.y += (player.position.y - camera.y) * 0.1;

    bodies.forEach((tuple) => {
        const sprite = tuple[0];
        const body = tuple[1];

        if (body === selected && mode !== 0) {
            sprite.tint = 0xFF0000;
        } else {
            sprite.tint = 0xFFFFFF;
        }

        sprite.x = (body.position.x - camera.x) * camera.scale + app.view.width/2;
        sprite.y = (body.position.y - camera.y) * camera.scale + app.view.height/2;
        
        sprite.angle = body.angle * 180/Math.PI;
    });

    text.text = `Elevation: ${Math.round(-player.position.y)}`;
    
    console.log(won);
    if (-player.position.y > 670 ) {
        won = true;
    }
    if (!won) {
        updateTimer();
    }
});

let text = new PIXI.Text("Elevation: 0", {
    stroke: "#fff",
    strokeThickness: 5,
    lineJoin: "round",
    fontSize: 50,
});

text.position.x = window.innerWidth * 0.8;
text.position.y = window.innerHeight * 0.05;

let timer = new PIXI.Text("Time: 0", {
    stroke: "#fff",
    strokeThickness: 5,
    lineJoin: "round",
    fontSize: 50,
});

timer.position.x = window.innerWidth * 0.8;
timer.position.y = window.innerHeight * 0.12;

var startTime = new Date().getTime();
function updateTimer() {
    const currentTime = new Date().getTime() - startTime;
    const minutes = Math.floor(currentTime / (60 * 1000)).toString().padStart(2, '0');
    const seconds = Math.floor((currentTime % (60 * 1000)) / 1000).toString().padStart(2, '0');
    const milliseconds = (currentTime % 1000).toString().padStart(3, '0');
    timer.text = `Time: ${minutes}:${seconds}:${milliseconds}`;
}

loadedMap.forEach((map) => {
    const saved = map as any;
    const body = createBox(saved.x, saved.y, saved.w, saved.h, "nothing.png", { isStatic: true });
    Body.setAngle(body, saved.a);
});
console.log(loadedMap.length);
console.log(bodies.length);

(document.querySelector("#export") as HTMLButtonElement).addEventListener("click", ()=>{
    let i = 0;
    const map: {x: number, y: number, w: number, h: number, a: number}[] = [];
    bodies.forEach((tuple) => {
        const sprite = tuple[0];
        const body = tuple[1];

        if (body === player) return;
        console.log(app.stage.children.findIndex((value) => {return value==sprite}) === -1);
        if (app.stage.children.findIndex((value) => {return value==sprite}) === -1) return; 

        map.push({x: body.position.x, y: body.position.y, h: sprite.height/camera.scale, w: sprite.width/camera.scale, a: body.angle});
        i++;
    });

    console.log(JSON.stringify(map));
});

(document.querySelector("#mode") as HTMLButtonElement).addEventListener("click", (e)=>{
    mode = (mode+1) % 4;

    const button = e.target as HTMLButtonElement;
    if (mode === 0) {
        button.innerText = "Control";
    } else if (mode === 1) {
        button.innerText = "Build";
    } else if (mode === 2) {
        button.innerText = "Edit";
    } else if (mode === 3) {
        button.innerText = "Delete";
    }
});

window.addEventListener("keypress", (e) => {
    if (e.repeat) return;

    if (e.key === "1") {
        mode = 0;
    } else if (e.key === "2") {
        mode = 1;
    } else if (e.key === "3") {
        mode = 2;
    }  else if (e.key === "4") {
        mode = 3;
    } else if (e.key === "g") {
        console.log(bodies.length);
    }

    const button = document.querySelector("#mode") as HTMLButtonElement;
    if (mode === 0) {
        button.innerText = "Control";
    } else if (mode === 1) {
        button.innerText = "Build";
    } else if (mode === 2) {
        button.innerText = "Edit";
    } else if (mode === 3) {
        button.innerText = "Delete";
    }

    if (mode > 0) {
        engine.gravity.scale = 0;
    } else {
        engine.gravity.scale = 0.001;
    }
});

Events.on(engine, "collisionStart", (e)=>{
    e.pairs.forEach((pair) => {
        if (pair.bodyA === player || pair.bodyB === player) {
            let name = "newclunk" + (Math.floor(Math.random() * 5) + 1) + ".wav";

            console.log(name);
            let sound = new Howl({
                src: [name]
            })
            sound.play();
            canjump = true;
        }
    });
});

// const render = Render.create({canvas: app.view as HTMLCanvasElement, engine: engine});
// Render.run(render);

app.stage.addChild(text);
app.stage.addChild(timer);