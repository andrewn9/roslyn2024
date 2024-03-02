import './style.css'
import { Engine, Bodies, Composite, IChamferableBodyDefinition, Body, Vector, World, Events} from 'matter-js'
import * as PIXI from 'pixi.js'
import loadedMap from './map.json'
import { Howl } from 'howler';

const bodies: [PIXI.Sprite, Body][] = [];
var logo: PIXI.Sprite;

let mode = 0;

let selected: Body|undefined;

const sounds = {
    jump: new Howl({
        src: ['spring.wav']
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
            app.stage.removeChild(sprite);
            World.remove(engine.world, selected);
        }
    });

    Composite.add(engine.world, body);
    bodies.push([sprite, body]);

    return body;
}

const maxF = 4;
const maxDrag = 20000;
var compression = 0;
var spring_force: Vector;

window.addEventListener("auxclick", (e) => {
    if (e.button === 1) {
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

        let current = {x: ev.clientX, y: ev.clientY};
        let wpos = Vector.add(player.position, Vector.sub(current,start));
        let move = Vector.normalise(Vector.sub(wpos, player.position));
        let mag = Math.min(Vector.magnitudeSquared(Vector.sub(wpos, player.position)) / maxDrag, 1);
        compression = mag;
        spring_force = Vector.mult(move, mag * maxF);
        spring_force.x *= -0.5;
        spring_force.y *= -1;

        if (mode === 1) {
            sprite.x = Math.min(e.clientX, ev.clientX);
            sprite.y = Math.min(e.clientY, ev.clientY);
            sprite.width = Math.abs(ev.clientX - e.clientX);
            sprite.height = Math.abs(ev.clientY - e.clientY);
        } else if (mode === 2 && selected) {
            Body.setAngle(selected, Math.atan2(ev.clientY - (selected.position.y - camera.y) * camera.scale - app.view.height/2, ev.clientX - (selected.position.x - camera.x) * camera.scale - app.view.width/2));
            // selected.angle = ;
        }

        if (logo) {
            logo.height = 50/(mag+1);
            // logo.anchor.y = 1;
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
        if (mode === 0 && spring_force) {
            Body.applyForce(player, player.position, spring_force);
            const id = sounds.jump.play();
            sounds.jump.rate(Math.random()*.5+1, id);
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

const background = new PIXI.Sprite(PIXI.Texture.from("v1.png"));
background.anchor.y = 0.69;
app.stage.addChild(background);

const player = createBox(0, 0, 10, 10, "logo.png", {density: 1, frictionStatic: 2,friction: 1, restitution: 0.2});

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

app.ticker.add((dt) => {
    camera.y += (player.position.y - camera.y) * 0.1;

    background.x = -camera.x * camera.scale;
    background.y = -camera.y * camera.scale;
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
});

let text = new PIXI.Text("Elevation: 0", {
    stroke: "#fff",
    strokeThickness: 5,
    lineJoin: "round",
    zIndex: 999
});
text.position.x = window.innerWidth -220;
text.position.y = 10;

loadedMap.forEach((map) => {
    const saved = map as any;
    const body = createBox(saved.x, saved.y, saved.w, saved.h, "nothing.png", { isStatic: true });
    Body.setAngle(body, saved.a);
});

(document.querySelector("#export") as HTMLButtonElement).addEventListener("click", ()=>{
    let i = 0;
    const map: {x: number, y: number, w: number, h: number, a: number}[] = [];
    bodies.forEach((tuple) => {
        const sprite = tuple[0];
        const body = tuple[1];

        if (body === player) return;

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
            let name = "newclunk" + ((Math.random() * 5) + 1) + ".wav";
            let sound = new Howl({
                src: [name]
            })
            sound.play();
        }
    });
});

// const render = Render.create({canvas: app.view as HTMLCanvasElement, engine: engine});
// Render.run(render);

app.stage.addChild(text);