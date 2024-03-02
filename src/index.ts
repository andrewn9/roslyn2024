import './style.css'
import { Engine, Render, Runner, Bodies, Composite } from 'matter-js'

const canvas = document.createElement("canvas");
document.body.appendChild(canvas);

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
document.addEventListener("DOMContentLoaded", () => {
    resize();
});

window.addEventListener("pointerdown", (e) => {
    function pointerup(ev: PointerEvent) {
        if (e.pointerId !== ev.pointerId) return;
        let x = Math.min(e.clientX, ev.clientX), y = Math.min(e.clientY, ev.clientY), w = Math.abs(ev.clientX-e.clientX), h = Math.abs(ev.clientY-e.clientY);
        
        x += w/2;
        y += h/2;

        const body = Bodies.rectangle(x, y, w, h, { isStatic: true });
        map.push(body);
        Composite.add(engine.world, body);

        window.removeEventListener("pointerup", pointerup);
    }

    window.addEventListener("pointerup", pointerup);
});

const engine = Engine.create();

const render = Render.create({
    engine: engine,
    canvas: canvas
});

const player = Bodies.rectangle(400, 200, 10, 10);

const map = [Bodies.rectangle(400, 600, 100, 10, { isStatic: true })];

Composite.add(engine.world, [...map, player]);

Render.run(render);

const runner = Runner.create();
Runner.run(runner, engine);