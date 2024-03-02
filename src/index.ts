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