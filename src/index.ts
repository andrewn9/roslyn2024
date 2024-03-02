import './style.css'
import { Engine, Render, Runner, Bodies, Composite, IChamferableBodyDefinition, Body } from 'matter-js'
import * as PIXI from 'pixi.js'

const bodies: [PIXI.Sprite, Body][] = [];

function createBox(x: number, y: number, w: number, h: number, source: PIXI.TextureSource, options?: IChamferableBodyDefinition, addMap = true) {
    const body = Bodies.rectangle(x, y, w, h, options);
    
    if (addMap) {
        map.push(body);
    }

    const sprite = new PIXI.Sprite(PIXI.Texture.from(source));
    sprite.height = h;
    sprite.width = w;
    sprite.x = x;
    sprite.y = y;
    sprite.anchor.x = 0.5;
    sprite.anchor.y = 0.5;
    app.stage.addChild(sprite);

    Composite.add(engine.world, body);
    bodies.push([sprite, body]);
}

window.addEventListener("pointerdown", (e) => {
    function pointerup(ev: PointerEvent) {
        if (e.pointerId !== ev.pointerId) return;
        let x = Math.min(e.clientX, ev.clientX), y = Math.min(e.clientY, ev.clientY), w = Math.abs(ev.clientX-e.clientX), h = Math.abs(ev.clientY-e.clientY);
        
        x += w/2;
        y += h/2;

        createBox(x, y, w, h, "gray.png", { isStatic: true });

        window.removeEventListener("pointerup", pointerup);
    }

    window.addEventListener("pointerup", pointerup);
});

const app = new PIXI.Application({ resizeTo: window });
document.body.appendChild(app.view as HTMLCanvasElement);

const engine = Engine.create();

const player = createBox(400, 200, 10, 10, "gray.png", {}, false);

const map: Body[] = [];


createBox(400, 600, 100, 10, "gray.png", { isStatic: true });

const runner = Runner.create();
Runner.run(runner, engine);

app.ticker.add(() => {
    bodies.forEach((tuple) => {
        const sprite = tuple[0];
        const body = tuple[1];

        sprite.x = body.position.x;
        sprite.y = body.position.y;
        sprite.angle = body.angle * 180/Math.PI;
    });
});