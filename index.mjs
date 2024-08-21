// index.mts
class Color {
  css;
  static get Red() {
    return new Color("#a91409");
  }
  static get Blue() {
    return new Color("#0a6ab6");
  }
  static get Black() {
    return new Color("#000000");
  }
  constructor(css) {
    this.css = css;
  }
}

class Vector2 {
  x;
  y;
  static get Zero() {
    return new Vector2(0, 0);
  }
  static get One() {
    return new Vector2(1, 1);
  }
  static get Up() {
    return new Vector2(0, -1);
  }
  static get Down() {
    return new Vector2(0, 1);
  }
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
  clone() {
    return new Vector2(this.x, this.y);
  }
  add(v) {
    this.x += v.x;
    this.y += v.y;
    return this;
  }
  sub(v) {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }
  mul(by) {
    this.x *= by;
    this.y *= by;
    return this;
  }
  lenSq() {
    return this.x * this.x + this.y * this.y;
  }
  len() {
    return Math.sqrt(this.lenSq());
  }
  normalize() {
    return this.mul(1 / this.len());
  }
}

class GameObject {
  position = new Vector2(0, 0);
  destroy = false;
  visible = true;
  game;
  constructor(game) {
    this.game = game;
  }
  update(delta) {
  }
  draw(ctx) {
  }
}

class Circle extends GameObject {
  velocity = new Vector2(0, 0);
  radius;
  color;
  constructor(game, radius, color) {
    super(game);
    this.radius = radius;
    this.color = color;
  }
  update(delta) {
    this.position.add(this.velocity.clone().mul(delta));
  }
  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.fillStyle = this.color.css;
    ctx.fill();
  }
}

class Hero extends Circle {
  initialCooldown = 1000;
  initialSpeed = 0.1;
  cooldown = 0;
  score = 0;
  target = null;
  pad;
  intersectedWithPad = false;
  constructor(game, pad, color) {
    super(game, 45, color);
    this.game = game;
    this.pad = pad;
  }
  update(delta) {
    super.update(delta);
    const intersectsWithPad = pad.intersectsWith(this);
    const padIsInTheWay = Math.sign(pad.position.y - this.position.y) == Math.sign(this.velocity.y);
    const shoudBounceOffThePad = intersectsWithPad && !this.intersectedWithPad && padIsInTheWay;
    this.intersectedWithPad = intersectsWithPad;
    const toUpper = this.position.y;
    const toLower = this.game.canvas_size.y - this.position.y;
    if (toUpper <= this.radius || toLower <= this.radius || shoudBounceOffThePad) {
      this.velocity.y *= -1;
    }
    this.cooldown += delta;
    if (this.cooldown >= this.initialCooldown) {
      this.cooldown -= this.initialCooldown;
      const proj = new Projectile(this.game, this.target, this.color);
      proj.velocity = this.target.position.clone().sub(this.position).normalize().mul(proj.initialSpeed);
      proj.position = this.position.clone();
      this.game.objects.push(proj);
    }
  }
}

class Projectile extends Circle {
  initialSpeed = 0.5;
  target;
  constructor(game, target, color) {
    super(game, 15, color);
    this.target = target;
  }
  update(delta) {
    super.update(delta);
    const toLeft = this.position.x;
    const toRight = this.game.canvas_size.x - this.position.x;
    if (toLeft <= -this.radius || toRight <= -this.radius) {
      this.destroy = true;
    }
    const distSq = this.position.clone().sub(this.target.position).lenSq();
    const radSq = Math.pow(this.radius + this.target.radius, 2);
    if (distSq <= radSq) {
      this.target.score--;
      this.destroy = true;
    }
  }
}
var Math_clamp = (v, min, max) => Math.min(Math.max(v, min), max);

class Pad extends GameObject {
  width = 2 * 45;
  height = 3;
  update(delta) {
    super.update(delta);
    this.visible = game.mouse_hover;
    this.position = game.mouse_position;
  }
  draw(ctx) {
    ctx.beginPath();
    ctx.lineWidth = this.height;
    const halfWidth = this.width * 0.5;
    ctx.moveTo(this.position.x - halfWidth, this.position.y);
    ctx.lineTo(this.position.x + halfWidth, this.position.y);
    ctx.closePath();
    ctx.stroke();
  }
  intersectsWith(circle) {
    const halfWidth = this.width * 0.5;
    const leftX = this.position.x - halfWidth;
    const rightX = this.position.x + halfWidth;
    const nearest = new Vector2(Math_clamp(circle.position.x, leftX, rightX), this.position.y);
    return nearest.sub(circle.position).lenSq() <= Math.pow(circle.radius, 2);
  }
}

class Score extends GameObject {
  heroA;
  heroB;
  height = 25;
  color = Color.Black;
  width = "0:0".length * this.height;
  constructor(game, a, b) {
    super(game);
    this.heroA = a;
    this.heroB = b;
  }
  update(delta) {
    this.position.x = this.game.canvas_size.x * 0.5 - this.width * 0.5;
    this.position.y = this.height;
  }
  draw(ctx) {
    ctx.font = `${this.height}px sans-serif`;
    ctx.fillStyle = this.color.css;
    const a = (-heroA.score).toString().padStart(2, "0");
    const b = (-heroB.score).toString().padStart(2, "0");
    ctx.fillText(`${a}:${b}`, this.position.x, this.position.y, this.width);
  }
}

class Game {
  objects = [];
  canvas;
  canvas_size;
  ctx;
  timestamp = 0;
  canvas_rect;
  constructor() {
    this.canvas = document.querySelector("canvas");
    this.canvas_size = new Vector2(this.canvas.width, this.canvas.height);
    this.canvas_rect = this.canvas.getBoundingClientRect();
    this.ctx = this.canvas.getContext && this.canvas.getContext("2d");
    console.assert(!!this.ctx);
    window.addEventListener("mouseenter", this.input.bind(this, true));
    window.addEventListener("mousemove", this.input.bind(this, true));
    window.addEventListener("mouseleave", this.input.bind(this, false));
    this.draw = this.draw.bind(this);
  }
  draw(timestamp) {
    const delta = timestamp - this.timestamp;
    this.timestamp = timestamp;
    this.ctx.clearRect(0, 0, this.canvas_size.x, this.canvas_size.y);
    for (const obj of this.objects) {
      obj.update(delta);
    }
    for (let i = this.objects.length - 1;i >= 0; i--) {
      if (this.objects[i].destroy) {
        this.objects.splice(i, 1);
      }
    }
    for (const obj of this.objects) {
      if (obj.visible) {
        obj.draw(this.ctx);
      }
    }
    this.start();
  }
  start() {
    requestAnimationFrame(this.draw);
  }
  mouse_hover = false;
  mouse_position = Vector2.Zero;
  input(hover, ev) {
    this.mouse_hover = hover;
    this.mouse_position.x = ev.clientX - this.canvas_rect.left;
    this.mouse_position.y = ev.clientY - this.canvas_rect.top;
  }
}
var game = new Game;
var pad = new Pad(game);
game.objects.push(pad);
var heroA = new Hero(game, pad, Color.Red);
heroA.position = Vector2.One.mul(heroA.radius + 2);
heroA.velocity = Vector2.Down.mul(heroA.initialSpeed);
heroA.cooldown = 0;
game.objects.push(heroA);
var heroB = new Hero(game, pad, Color.Blue);
heroB.position = Vector2.One.mul(-(heroB.radius + 2)).add(game.canvas_size);
heroB.velocity = Vector2.Up.mul(heroB.initialSpeed);
heroB.cooldown = heroB.initialCooldown;
game.objects.push(heroB);
heroA.target = heroB;
heroB.target = heroA;
var score = new Score(game, heroA, heroB);
game.objects.push(score);
game.start();
