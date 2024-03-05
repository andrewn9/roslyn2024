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

    const indicator = new PIXI.Sprite(PIXI.Texture.from("logo.png"));
    indicator.position.x = e.clientX;
    indicator.position.y = e.clientY;
    indicator.width = 10;
    indicator.height = 10;
    indicator.anchor.set(0.5, 0.5);
    app.stage.addChild(indicator);
    
    function pointermove(ev: PointerEvent) {
        if (e.pointerId !== ev.pointerId) return;

        if (mode === 0) {
            const diff = Vector.sub({x: ev.clientX, y: ev.clientY}, start);
            diff.x /= window.innerWidth;
            diff.y /= window.innerHeight;
            
            if (logo) {
                logo.height = 50/(Vector.magnitudeSquared(diff)+1);
            }
        } else if (mode === 1) {
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
        if (mode === 0) {
            const diff = Vector.sub({x: ev.clientX, y: ev.clientY}, start);
            console.log(diff);
            diff.x = -Math.min(Math.abs(diff.x/window.innerHeight), 0.5) * Math.sign(diff.x) * 6;
            diff.y = -Math.min(Math.abs(diff.y/window.innerWidth), 0.5) * Math.sign(diff.y) * 20;
            console.log(diff);
            Body.setVelocity(player, Vector.add(player.velocity, diff));
            const id = sounds.jump.play();
            sounds.jump.rate(Math.random()*0.5+1, id);
            canjump = false;
            if (!started) {
                started = true;
                startTime = new Date().getTime();
            }
        } else if (mode === 1) {
            createBox(x, y, w, h, "gray.png", { isStatic: true });
        }

        app.stage.removeChild(sprite);
        app.stage.removeChild(indicator);
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
let dt = 16;
function loop(t) {
    dt = Math.min(t-time, 100) || 16;
    time = t;
    // console.log(dt);
    requestAnimationFrame(loop)
    Engine.update(engine, dt);
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
    
    if (-player.position.y > 670 ) {
        won = true;
    }
    if (!won && started) {
        updateTimer();
    }
});

let text = new PIXI.Text("Elevation: 0", {
    stroke: "#fff",
    align: 'right',
    strokeThickness: 5,
    lineJoin: "round",
    fontSize: 50,
});

text.anchor.x = 1;
text.anchor.y = 1;
text.position.x = window.innerWidth * 0.95;
text.position.y = window.innerHeight * 0.12;

let timer = new PIXI.Text("Time: 0", {
    stroke: "#fff",
    align: 'right',
    strokeThickness: 5,
    lineJoin: "round",
    fontSize: 50,
});

timer.anchor.x = 1;
timer.anchor.y = 1;
timer.position.x = window.innerWidth * 0.95;
timer.position.y = window.innerHeight * 0.18;


var startTime = 0;
function updateTimer() {
    const currentTime = new Date().getTime() - startTime;
    const minutes = Math.floor(currentTime / (60 * 1000)).toString().padStart(2, '0');
    const seconds = Math.floor((currentTime % (60 * 1000)) / 1000).toString().padStart(2, '0');
    const milliseconds = (currentTime % 1000).toString().padStart(3, '0');
    timer.text = `Time: ${minutes}:${seconds}:${milliseconds}`;
}

var started = false;

loadedMap.forEach((map) => {
    const saved = map as any;
    const body = createBox(saved.x, saved.y, saved.w, saved.h, "gray.png", { isStatic: true });
    Body.setAngle(body, saved.a);
});

(document.querySelector("#export") as HTMLButtonElement).addEventListener("click", ()=>{
    let i = 0;
    const map: {x: number, y: number, w: number, h: number, a: number}[] = [];
    bodies.forEach((tuple) => {
        const sprite = tuple[0];
        const body = tuple[1];

        if (body === player || body === bg_object || sprite.height === 0 || sprite.width === 0) return;
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

window.addEventListener("keydown", (e) => {
    if (mode === 2 && selected) {
        const key = e.key.toLowerCase();
        if (key === "arrowleft") {
            selected.position.x -= 1;
        } else if (key === "arrowright") {
            selected.position.x += 1;
        } else if (key === "arrowup") {
            selected.position.y -= 1;
        } else if (key === "arrowdown") {
            selected.position.y += 1;
        }
    }
});

window.addEventListener("keypress", (e) => {

    if (e.key === "1") {
        mode = 0;
    } else if (e.key === "2") {
        mode = 1;
    } else if (e.key === "3") {
        mode = 2;
    }  else if (e.key === "4") {
        mode = 3;
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