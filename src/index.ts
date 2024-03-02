import './style.css'
import { Engine, Runner, Bodies, Composite, IChamferableBodyDefinition, Body, Vector} from 'matter-js'
import { Serializer } from 'matter-tools'
import * as PIXI from 'pixi.js'
import { normalizePath } from 'vite';

const bodies: [PIXI.Sprite, Body][] = [];
var logo: PIXI.Sprite;

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

    if (source == "logo.png") {
        logo = sprite;
    }

    app.stage.addChild(sprite);

    Composite.add(engine.world, body);
    bodies.push([sprite, body]);

    return body;
}

const maxF = 3.5;
const maxDrag = 45000;
var compression = 0;

window.addEventListener("pointerdown", (e) => {

    let start = {x: e.clientX, y: e.clientY};
    console.log("start");
    const sprite = new PIXI.Sprite(PIXI.Texture.from("gray.png"));
    app.stage.addChild(sprite);
    sprite.height = 0;

    function pointermove(ev: PointerEvent) {
        if (e.pointerId !== ev.pointerId) return;

        sprite.x = Math.min(e.clientX, ev.clientX);
        sprite.y = Math.min(e.clientY, ev.clientY);
        sprite.width = Math.abs(ev.clientX - e.clientX);
        sprite.height = Math.abs(ev.clientY - e.clientY);

        let current = {x: ev.clientX, y: ev.clientY};
        let wpos = Vector.add(player.position, Vector.sub(current,start));
        let mag = Math.min(Vector.magnitudeSquared(Vector.sub(wpos, player.position)) / maxDrag, 1);

        if (logo) {
            logo.height = (1-mag) * logo.texture.height;
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
        
        mag = mag/maxDrag * maxF;
        mag = Math.min(mag, maxF);
        // console.log(mag);

        let force = Vector.mult(direction, mag);

        x -= app.view.width/2;
        y -= app.view.height/2;
        x /= camera.scale;
        y /= camera.scale;
        w /= camera.scale;
        h /=camera.scale;
        x += camera.x;
        y += camera.y;


        console.log(`${force.x} ${force.y}`)

        Body.applyForce(player, player.position, force);
        // createBox(x, y, w, h, "gray.png", { isStatic: true });

        if (logo) {
            logo.height = logo.texture.height;
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
engine.timing.timeScale = 1;

const map: Body[] = [];

const player = createBox(0, 0, 10, 10, "logo.png", {density: 1}, false);

createBox(0, 100, 100, 10, "gray.png", { isStatic: true });

const runner = Runner.create();
Runner.run(runner, engine);

app.ticker.add(() => {
    camera.y += (player.position.y - camera.y) * 0.1;
    bodies.forEach((tuple) => {
        const sprite = tuple[0];
        const body = tuple[1];

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