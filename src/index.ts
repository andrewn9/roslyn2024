import './style.css'
import { Engine, Render, Runner, Bodies, Composite, IChamferableBodyDefinition, Body, Vector} from 'matter-js'
import { Serializer } from 'matter-tools'
import * as PIXI from 'pixi.js'

const bodies: [PIXI.Sprite, Body][] = [];

let mode = 0;

let selected: Body|undefined;

function createBox(x: number, y: number, w: number, h: number, source: PIXI.TextureSource, options?: IChamferableBodyDefinition, addMap = true) {
    const body = Bodies.rectangle(x, y, w, h, options);
    
    if (addMap) {
        map.push(body);
    }

    const texture = PIXI.Texture.from(source);
    
    const sprite = new PIXI.Sprite(texture);
    sprite.height = h * camera.scale;
    sprite.width = w * camera.scale;
    sprite.x = x;
    sprite.y = y;
    sprite.anchor.x = 0.5;
    sprite.anchor.y = 0.5;
    app.stage.addChild(sprite);
    sprite.eventMode = "dynamic";

    sprite.on("click", () => {
        selected = body;
    });

    Composite.add(engine.world, body);
    bodies.push([sprite, body]);

    return body;
}

window.addEventListener("pointerdown", (e) => {
    let start = {x: e.clientX, y: e.clientY};
    const sprite = new PIXI.Sprite(PIXI.Texture.from("gray.png"));
    app.stage.addChild(sprite);
    sprite.height = 0;

    function pointermove(ev: PointerEvent) {
        if (e.pointerId !== ev.pointerId) return;
        
        if (mode === 1) {
            sprite.x = Math.min(e.clientX, ev.clientX);
            sprite.y = Math.min(e.clientY, ev.clientY);
            sprite.width = Math.abs(ev.clientX - e.clientX);
            sprite.height = Math.abs(ev.clientY - e.clientY);
        } else if (mode === 2 && selected) {
            if (selected.isStatic) {
                selected.inertia = Infinity;
                selected.inverseInertia = 0;
            }
            Body.setAngle(selected, Math.atan2(ev.clientY - e.clientY, ev.clientX - e.clientX));
            // selected.angle = ;
        }
    }

    function pointerup(ev: PointerEvent) {
        if (e.pointerId !== ev.pointerId) return;
        let x = Math.min(e.clientX, ev.clientX), y = Math.min(e.clientY, ev.clientY), w = Math.abs(ev.clientX-e.clientX), h = Math.abs(ev.clientY-e.clientY);
        
        x += w/2;
        y += h/2;

        let mag = Vector.magnitudeSquared(Vector.sub({x: x, y:y}, start));
        let direction = Vector.normalise(Vector.sub({x: x, y:y}, start));
        direction.x *=-1;
        direction.y *=-1;
        let force = Vector.mult(direction, mag/10000);

        x -= app.view.width/2;
        y -= app.view.height/2;
        x /= camera.scale;
        y /= camera.scale;
        w /= camera.scale;
        h /=camera.scale;
        x += camera.x;
        y += camera.y;

        if (mode === 0) {
            Body.applyForce(player, player.position, force);
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
engine.timing.timeScale = 0.2;

const player = createBox(0, 0, 10, 10, "gray.png", {density: 1}, false);

const map: Body[] = [];

createBox(0, 100, 100, 10, "gray.png", { isStatic: true });

const runner = Runner.create();
Runner.run(runner, engine);

app.ticker.add(() => {
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
});

const serializer = Serializer.create();
(document.querySelector("#export") as HTMLButtonElement).addEventListener("click", ()=>{
    const link = document.createElement("a");
    link.href = `data:text/,${Serializer.serialise(serializer, engine.world)}`;
    link.download = "map.json";
    link.click();
});

(document.querySelector("#mode") as HTMLButtonElement).addEventListener("click", (e)=>{
    mode = (mode+1) % 3;

    const button = e.target as HTMLButtonElement;
    if (mode === 0) {
        button.innerText = "Control";
    } else if (mode === 1) {
        button.innerText = "Build";
    } else if (mode === 2) {
        button.innerText = "Edit";
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
    }
    const button = document.querySelector("#mode") as HTMLButtonElement;
    if (mode === 0) {
        button.innerText = "Control";
    } else if (mode === 1) {
        button.innerText = "Build";
    } else if (mode === 2) {
        button.innerText = "Edit";
    }
});

// const render = Render.create({canvas: app.view as HTMLCanvasElement, engine: engine});
// Render.run(render);