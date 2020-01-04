(function(l, r) {
  if (l.getElementById("livereloadscript")) return;
  r = l.createElement("script");
  r.async = 1;
  r.src =
    "//" +
    (window.location.host || "localhost").split(":")[0] +
    ":35729/livereload.js?snipver=1";
  r.id = "livereloadscript";
  l.head.appendChild(r);
})(window.document);
var app = (function() {
  "use strict";

  function noop(args) {
    // console.log('xxx noop');
  }
  const identity = x => x;
  function run(fn) {
    return fn();
  }
  function blank_object() {
    return Object.create(null);
  }
  function run_all(fns) {
    fns.forEach(run);
  }
  function is_function(thing) {
    return typeof thing === "function";
  }
  function safe_not_equal(a, b) {
    return a != a
      ? b == b
      : a !== b || ((a && typeof a === "object") || typeof a === "function");
  }

  const is_client = typeof window !== "undefined";
  let now = is_client ? () => window.performance.now() : () => Date.now();
  let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

  const tasks = new Set();
  function run_tasks(now) {
    tasks.forEach(task => {
      if (!task.c(now)) {
        tasks.delete(task);
        task.f();
      }
    });
    if (tasks.size !== 0) raf(run_tasks);
  }
  /**
   * Creates a new task that runs on each raf frame
   * until it returns a falsy value or is aborted
   */
  function loop(callback) {
    let task;
    if (tasks.size === 0) raf(run_tasks);
    return {
      promise: new Promise(fulfill => {
        tasks.add((task = { c: callback, f: fulfill }));
      }),
      abort() {
        tasks.delete(task);
      }
    };
  }

  function append(target, node) {
    target.appendChild(node);
  }
  function insert(target, node, anchor) {
    target.insertBefore(node, anchor || null);
  }
  function detach(node) {
    node.parentNode.removeChild(node);
  }
  function element(name) {
    return document.createElement(name);
  }
  function text(data) {
    return document.createTextNode(data);
  }
  function space() {
    return text(" ");
  }
  function empty() {
    return text("");
  }
  function listen(node, event, handler, options) {
    node.addEventListener(event, handler, options);
    return () => node.removeEventListener(event, handler, options);
  }
  function attr(node, attribute, value) {
    if (value == null) node.removeAttribute(attribute);
    else if (node.getAttribute(attribute) !== value)
      node.setAttribute(attribute, value);
  }
  function children(element) {
    return Array.from(element.childNodes);
  }
  function set_data(text, data) {
    data = "" + data;
    if (text.data !== data) text.data = data;
  }
  function custom_event(type, detail) {
    const e = document.createEvent("CustomEvent");
    e.initCustomEvent(type, false, false, detail);
    return e;
  }

  let stylesheet;
  let active = 0;
  let current_rules = {};
  // https://github.com/darkskyapp/string-hash/blob/master/index.js
  function hash(str) {
    let hash = 5381;
    let i = str.length;
    while (i--) hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
    return hash >>> 0;
  }
  function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
    // console.log('xxx create_rule', {
    // 	a,
    // 	b,
    // 	duration
    // });
    const step = 16.666 / duration;
    let keyframes = "{\n";
    for (let p = 0; p <= 1; p += step) {
      const t = a + (b - a) * ease(p);
      keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
    }
    const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
    const name = `__svelte_${hash(rule)}_${uid}`;
    if (!current_rules[name]) {
      if (!stylesheet) {
        const style = element("style");
        document.head.appendChild(style);
        stylesheet = style.sheet;
      }
      current_rules[name] = true;
      // console.log('xxx inserting rule');
      window.xxx = stylesheet;
      stylesheet.insertRule(
        `@keyframes ${name} ${rule}`,
        stylesheet.cssRules.length
      );
    }
    const animation = node.style.animation || "";
    node.style.animation = `${
      animation ? `${animation}, ` : ``
    }${name} ${duration}ms linear ${delay}ms 1 both`;
    // console.log('xxx create_rule', rule);
    active += 1;
    return name;
  }
  function delete_rule(node, name) {
    node.style.animation = (node.style.animation || "")
      .split(", ")
      .filter(
        name
          ? anim => anim.indexOf(name) < 0 // remove specific animation
          : anim => anim.indexOf("__svelte") === -1 // remove all Svelte animations
      )
      .join(", ");
    if (name && !--active) clear_rules();
  }
  function clear_rules() {
    raf(() => {
      if (active) return;
      let i = stylesheet.cssRules.length;
      while (i--) stylesheet.deleteRule(i);
      current_rules = {};
    });
  }

  let current_component;
  function set_current_component(component) {
    current_component = component;
  }

  const dirty_components = [];
  const binding_callbacks = [];
  const render_callbacks = [];
  const flush_callbacks = [];
  const resolved_promise = Promise.resolve();
  let update_scheduled = false;
  function schedule_update() {
    if (!update_scheduled) {
      update_scheduled = true;
      resolved_promise.then(flush);
    }
  }
  function add_render_callback(fn) {
    render_callbacks.push(fn);
  }
  function flush() {
    const seen_callbacks = new Set();
    do {
      // first, call beforeUpdate functions
      // and update components
      while (dirty_components.length) {
        const component = dirty_components.shift();
        set_current_component(component);
        update(component.$$);
      }
      while (binding_callbacks.length) binding_callbacks.pop()();
      // then, once components are updated, call
      // afterUpdate functions. This may cause
      // subsequent updates...
      for (let i = 0; i < render_callbacks.length; i += 1) {
        const callback = render_callbacks[i];
        if (!seen_callbacks.has(callback)) {
          callback();
          // ...so guard against infinite loops
          seen_callbacks.add(callback);
        }
      }
      render_callbacks.length = 0;
    } while (dirty_components.length);
    while (flush_callbacks.length) {
      flush_callbacks.pop()();
    }
    update_scheduled = false;
  }
  function update($$) {
    if ($$.fragment !== null) {
      $$.update();
      run_all($$.before_update);
      const dirty = $$.dirty;
      $$.dirty = [-1];
      $$.fragment && $$.fragment.p($$.ctx, dirty);
      $$.after_update.forEach(add_render_callback);
    }
  }

  let promise;
  function wait() {
    if (!promise) {
      promise = Promise.resolve();
      promise.then(() => {
        promise = null;
      });
    }
    return promise;
  }
  function dispatch(node, direction, kind) {
    node.dispatchEvent(custom_event(`${direction ? "intro" : "outro"}${kind}`));
  }
  const outroing = new Set();
  let outros;
  function group_outros() {
    outros = {
      r: 0,
      c: [],
      p: outros // parent group
    };
  }
  function check_outros() {
    if (!outros.r) {
      run_all(outros.c);
    }
    outros = outros.p;
  }
  function transition_in(block, local) {
    if (block && block.i) {
      outroing.delete(block);
      block.i(local);
    }
  }
  function transition_out(block, local, detach, callback) {
    if (block && block.o) {
      if (outroing.has(block)) return;
      outroing.add(block);
      outros.c.push(() => {
        outroing.delete(block);
        if (callback) {
          if (detach) block.d(1);
          callback();
        }
      });
      block.o(local);
    }
  }
  const null_transition = { duration: 0 };
  function create_bidirectional_transition(node, fn, params, intro) {
    // console.log('xxx create_bidirectional_transition', { params, intro });
    let config = fn(node, params);
    let t = intro ? 0 : 1;
    let running_program = null;
    let pending_program = null;
    let animation_name = null;
    function clear_animation() {
      if (animation_name) delete_rule(node, animation_name);
    }
    function init(program, duration) {
      const d = program.b - t;
      duration *= Math.abs(d);
      return {
        a: t,
        b: program.b,
        d,
        duration,
        start: program.start,
        end: program.start + duration,
        group: program.group
      };
    }
    function go(b) {
      const { delay = 0, duration = 300, easing = identity, tick = noop, css } =
        config || null_transition;
      const program = {
        start: now() + delay,
        b
      };
      if (!b) {
        // @ts-ignore todo: improve typings
        program.group = outros;
        outros.r += 1;
      }
      if (running_program) {
        pending_program = program;
      } else {
        // if this is an intro, and there's a delay, we need to do
        // an initial tick and/or apply CSS animation immediately
        if (css) {
          clear_animation();
          animation_name = create_rule(
            node,
            t,
            b,
            duration,
            delay,
            easing,
            css
          );
        }
        if (b) tick(0, 1);
        running_program = init(program, duration);
        add_render_callback(() => dispatch(node, b, "start"));
        loop(now => {
          if (pending_program && now > pending_program.start) {
            running_program = init(pending_program, duration);
            pending_program = null;
            dispatch(node, running_program.b, "start");
            if (css) {
              clear_animation();
              animation_name = create_rule(
                node,
                t,
                running_program.b,
                running_program.duration,
                0,
                easing,
                config.css
              );
            }
          }
          if (running_program) {
            if (now >= running_program.end) {
              tick((t = running_program.b), 1 - t);
              dispatch(node, running_program.b, "end");
              if (!pending_program) {
                // we're done
                if (running_program.b) {
                  // intro — we can tidy up immediately
                  clear_animation();
                } else {
                  // outro — needs to be coordinated
                  if (!--running_program.group.r)
                    run_all(running_program.group.c);
                }
              }
              running_program = null;
            } else if (now >= running_program.start) {
              const p = now - running_program.start;
              t =
                running_program.a +
                running_program.d * easing(p / running_program.duration);
              tick(t, 1 - t);
            }
          }
          return !!(running_program || pending_program);
        });
      }
    }
    return {
      run(b) {
        if (is_function(config)) {
          wait().then(() => {
            // @ts-ignore
            config = config();
            go(b);
          });
        } else {
          go(b);
        }
      },
      end() {
        clear_animation();
        running_program = pending_program = null;
      }
    };
  }
  function mount_component(component, target, anchor) {
    const { fragment, on_mount, on_destroy, after_update } = component.$$;
    fragment && fragment.m(target, anchor);
    // onMount happens before the initial afterUpdate
    add_render_callback(() => {
      const new_on_destroy = on_mount.map(run).filter(is_function);
      if (on_destroy) {
        on_destroy.push(...new_on_destroy);
      } else {
        // Edge case - component was destroyed immediately,
        // most likely as a result of a binding initialising
        run_all(new_on_destroy);
      }
      component.$$.on_mount = [];
    });
    after_update.forEach(add_render_callback);
  }
  function destroy_component(component, detaching) {
    const $$ = component.$$;
    if ($$.fragment !== null) {
      run_all($$.on_destroy);
      $$.fragment && $$.fragment.d(detaching);
      // TODO null out other refs, including component.$$ (but need to
      // preserve final state?)
      $$.on_destroy = $$.fragment = null;
      $$.ctx = [];
    }
  }
  function make_dirty(component, i) {
    if (component.$$.dirty[0] === -1) {
      dirty_components.push(component);
      schedule_update();
      component.$$.dirty.fill(0);
    }
    component.$$.dirty[(i / 31) | 0] |= 1 << i % 31;
  }
  function init(
    component,
    options,
    instance,
    create_fragment,
    not_equal,
    props,
    dirty = [-1]
  ) {
    const parent_component = current_component;
    set_current_component(component);
    const prop_values = options.props || {};
    const $$ = (component.$$ = {
      fragment: null,
      ctx: null,
      // state
      props,
      update: noop,
      not_equal,
      bound: blank_object(),
      // lifecycle
      on_mount: [],
      on_destroy: [],
      before_update: [],
      after_update: [],
      context: new Map(parent_component ? parent_component.$$.context : []),
      // everything else
      callbacks: blank_object(),
      dirty
    });
    let ready = false;
    $$.ctx = instance
      ? instance(component, prop_values, (i, ret, value = ret) => {
          if ($$.ctx && not_equal($$.ctx[i], ($$.ctx[i] = value))) {
            if ($$.bound[i]) $$.bound[i](value);
            if (ready) make_dirty(component, i);
          }
          return ret;
        })
      : [];
    $$.update();
    ready = true;
    run_all($$.before_update);
    // `false` as a special case of no DOM component
    $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
    if (options.target) {
      if (options.hydrate) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        $$.fragment && $$.fragment.l(children(options.target));
      } else {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        $$.fragment && $$.fragment.c();
      }
      if (options.intro) transition_in(component.$$.fragment);
      mount_component(component, options.target, options.anchor);
      flush();
    }
    set_current_component(parent_component);
  }
  class SvelteComponent {
    $destroy() {
      destroy_component(this, 1);
      this.$destroy = noop;
    }
    $on(type, callback) {
      const callbacks =
        this.$$.callbacks[type] || (this.$$.callbacks[type] = []);
      callbacks.push(callback);
      return () => {
        const index = callbacks.indexOf(callback);
        if (index !== -1) callbacks.splice(index, 1);
      };
    }
    $set() {
      // overridden by instance, if it has props
    }
  }

  function cubicOut(t) {
    const f = t - 1.0;
    return f * f * f + 1.0;
  }

  function fly(
    node,
    { delay = 0, duration = 400, easing = cubicOut, x = 0, y = 0, opacity = 0 }
  ) {
    // console.log('xxx fly');
    const style = getComputedStyle(node);
    const target_opacity = +style.opacity;
    const transform = style.transform === "none" ? "" : style.transform;
    const od = target_opacity * (1 - opacity);
    return {
      delay,
      duration,
      easing,
      css: (t, u) => `
			transform: ${transform} translate(${(1 - t) * x}px, ${(1 - t) * y}px);
			opacity: ${target_opacity - od * u}`
    };
  }

  /* src/App.svelte generated by Svelte v3.16.7 */

  function create_if_block(ctx) {
    let p;
    let p_transition;
    let current;
    let dispose;

    return {
      // create
      c() {
        // console.log('xxx create_if_block create', { current });
        p = element("p");
        p.textContent = "Flies in and out";

        dispose = [
          listen(p, "introstart", /*introstart_handler*/ ctx[3]),
          listen(p, "outrostart", /*outrostart_handler*/ ctx[4]),
          listen(p, "introend", /*introend_handler*/ ctx[5]),
          listen(p, "outroend", /*outroend_handler*/ ctx[6])
        ];
      },
      // mount
      m(target, anchor) {
        // console.log('xxx create_if_block mount', { current });
        insert(target, p, anchor);
        current = true;
      },
      p: noop,
      // intro
      i(local) {
        if (current) return;
        // console.log('xxx create_if_block intro', { current });

        add_render_callback(() => {
          if (!p_transition)
            p_transition = create_bidirectional_transition(
              p,
              fly,
              { y: 200, duration: 2000 },
              true
            );
          p_transition.run(1);
        });

        current = true;
      },
      // outro
      o(local) {
        // console.log('xxx create_if_block outro', { current });
        if (!p_transition)
          p_transition = create_bidirectional_transition(
            p,
            fly,
            { y: 200, duration: 2000 },
            false
          );
        p_transition.run(0);
        current = false;
      },
      // destroy
      d(detaching) {
        // console.log('xxx create_if_block destroy', { current });
        if (detaching) detach(p);
        if (detaching && p_transition) p_transition.end();
        run_all(dispose);
      }
    };
  }

  function create_fragment(ctx) {
    let p;
    let t0;
    let t1;
    let t2;
    let label;
    let input;
    let t3;
    let t4;
    let if_block_anchor;
    let current;
    let dispose;
    let if_block = /*visible*/ ctx[0] && create_if_block(ctx);

    return {
      c() {
        p = element("p");
        t0 = text("status: ");
        t1 = text(/*status*/ ctx[1]);
        t2 = space();
        label = element("label");
        input = element("input");
        t3 = text("\n\tvisible");
        t4 = space();
        if (if_block) if_block.c();
        if_block_anchor = empty();
        attr(input, "type", "checkbox");
        dispose = listen(input, "change", /*input_change_handler*/ ctx[2]);
      },
      m(target, anchor) {
        insert(target, p, anchor);
        append(p, t0);
        append(p, t1);
        insert(target, t2, anchor);
        insert(target, label, anchor);
        append(label, input);
        input.checked = /*visible*/ ctx[0];
        append(label, t3);
        insert(target, t4, anchor);
        if (if_block) if_block.m(target, anchor);
        insert(target, if_block_anchor, anchor);
        current = true;
      },
      p(ctx, [dirty]) {
        if (!current || dirty & /*status*/ 2) set_data(t1, /*status*/ ctx[1]);

        if (dirty & /*visible*/ 1) {
          input.checked = /*visible*/ ctx[0];
        }

        if (/*visible*/ ctx[0]) {
          if (if_block) {
            if_block.p(ctx, dirty);
            transition_in(if_block, 1);
          } else {
            if_block = create_if_block(ctx);
            if_block.c();
            transition_in(if_block, 1);
            if_block.m(if_block_anchor.parentNode, if_block_anchor);
          }
        } else if (if_block) {
          group_outros();

          transition_out(if_block, 1, 1, () => {
            if_block = null;
          });

          check_outros();
        }
      },
      i(local) {
        if (current) return;
        transition_in(if_block);
        current = true;
      },
      o(local) {
        transition_out(if_block);
        current = false;
      },
      d(detaching) {
        if (detaching) detach(p);
        if (detaching) detach(t2);
        if (detaching) detach(label);
        if (detaching) detach(t4);
        if (if_block) if_block.d(detaching);
        if (detaching) detach(if_block_anchor);
        dispose();
      }
    };
  }

  function instance($$self, $$props, $$invalidate) {
    let visible = true;
    let status = "waiting...";

    function input_change_handler() {
      visible = this.checked;
      $$invalidate(0, visible);
    }

    const introstart_handler = () =>
      $$invalidate(1, (status = "intro started"));
    const outrostart_handler = () =>
      $$invalidate(1, (status = "outro started"));
    const introend_handler = () => $$invalidate(1, (status = "intro ended"));
    const outroend_handler = () => $$invalidate(1, (status = "outro ended"));

    return [
      visible,
      status,
      input_change_handler,
      introstart_handler,
      outrostart_handler,
      introend_handler,
      outroend_handler
    ];
  }

  class App extends SvelteComponent {
    constructor(options) {
      super();
      init(this, options, instance, create_fragment, safe_not_equal, {});
    }
  }

  const app = new App({
    target: document.body,
    props: {
      name: "world"
    }
  });

  return app;
})();
//# sourceMappingURL=bundle.js.map
