import { h, render, Component } from '../../src/preact';
/** @jsx h */

// gives call count and argument errors names (otherwise sinon just uses "spy"):
let spy = (name, ...args) => {
	let spy = sinon.spy(...args);
	spy.displayName = `spy('${name}')`;
	return spy;
};

describe('refs', () => {
	let scratch;

	before( () => {
		scratch = document.createElement('div');
		(document.body || document.documentElement).appendChild(scratch);
	});

	beforeEach( () => {
		scratch.innerHTML = '';
	});

	after( () => {
		scratch.parentNode.removeChild(scratch);
		scratch = null;
	});

	it('should invoke refs in render()', () => {
		let ref = spy('ref');
		render(<div ref={ref} />, scratch);
		expect(ref).to.have.been.calledOnce.and.calledWith(scratch.firstChild);
	});

	it('should invoke refs in Component.render()', () => {
		let outer = spy('outer'),
			inner = spy('inner');
		class Foo extends Component {
			render() {
				return (
					<div ref={outer}>
						<span ref={inner} />
					</div>
				);
			}
		}
		render(<Foo />, scratch);

		expect(outer).to.have.been.calledWith(scratch.firstChild);
		expect(inner).to.have.been.calledWith(scratch.firstChild.firstChild);
	});

	it('should pass components to ref functions', () => {
		let ref = spy('ref'),
			instance;
		class Foo extends Component {
			constructor() {
				super();
				instance = this;
			}
			render() {
				return <div />;
			}
		}
		render(<Foo ref={ref} />, scratch);

		expect(ref).to.have.been.calledOnce.and.calledWith(instance);
	});

	it('should pass rendered DOM from functional components to ref functions', () => {
		let ref = spy('ref');

		const Foo = () => <div />;

		let root = render(<Foo ref={ref} />, scratch);
		expect(ref).to.have.been.calledOnce.and.calledWith(scratch.firstChild);

		ref.reset();
		render(<Foo ref={ref} />, scratch, root);
		expect(ref).to.have.been.calledOnce.and.calledWith(scratch.firstChild);

		ref.reset();
		render(<span />, scratch, root);
		expect(ref).to.have.been.calledOnce.and.calledWith(null);
	});

	it('should pass children to ref functions', () => {
		let outer = spy('outer'),
			inner = spy('inner'),
			rerender, inst;
		class Outer extends Component {
			constructor() {
				super();
				rerender = () => this.forceUpdate();
			}
			render() {
				return (
					<div>
						<Inner ref={outer} />
					</div>
				);
			}
		}
		class Inner extends Component {
			constructor() {
				super();
				inst = this;
			}
			render() {
				return <span ref={inner} />;
			}
		}

		let root = render(<Outer />, scratch);

		expect(outer).to.have.been.calledOnce.and.calledWith(inst);
		expect(inner).to.have.been.calledOnce.and.calledWith(inst.base);

		outer.reset();
		inner.reset();

		rerender();

		expect(outer).to.have.been.calledOnce.and.calledWith(inst);
		expect(inner).to.have.been.calledOnce.and.calledWith(inst.base);

		outer.reset();
		inner.reset();

		render(<div />, scratch, root);

		expect(outer).to.have.been.calledOnce.and.calledWith(null);
		expect(inner).to.have.been.calledOnce.and.calledWith(null);
	});

	it('should pass high-order children to ref functions', () => {
		let outer = spy('outer'),
			inner = spy('inner'),
			innermost = spy('innermost'),
			outerInst,
			innerInst;
		class Outer extends Component {
			constructor() {
				super();
				outerInst = this;
			}
			render() {
				return <Inner ref={inner} />;
			}
		}
		class Inner extends Component {
			constructor() {
				super();
				innerInst = this;
			}
			render() {
				return <span ref={innermost} />;
			}
		}

		let root = render(<Outer ref={outer} />, scratch);

		expect(outer, 'outer initial').to.have.been.calledOnce.and.calledWith(outerInst);
		expect(inner, 'inner initial').to.have.been.calledOnce.and.calledWith(innerInst);
		expect(innermost, 'innerMost initial').to.have.been.calledOnce.and.calledWith(innerInst.base);

		outer.reset();
		inner.reset();
		innermost.reset();
		root = render(<Outer ref={outer} />, scratch, root);

		expect(outer, 'outer update').to.have.been.calledOnce.and.calledWith(outerInst);
		expect(inner, 'inner update').to.have.been.calledOnce.and.calledWith(innerInst);
		expect(innermost, 'innerMost update').to.have.been.calledOnce.and.calledWith(innerInst.base);

		outer.reset();
		inner.reset();
		innermost.reset();
		root = render(<div />, scratch, root);

		expect(outer, 'outer unmount').to.have.been.calledOnce.and.calledWith(null);
		expect(inner, 'inner unmount').to.have.been.calledOnce.and.calledWith(null);
		expect(innermost, 'innerMost unmount').to.have.been.calledOnce.and.calledWith(null);
	});

	it('should not pass ref into component as a prop', () => {
		let foo = spy('foo'),
			bar = spy('bar');

		class Foo extends Component {
			render(){ return <div />; }
		}
		const Bar = spy('Bar', () => <div />);

		sinon.spy(Foo.prototype, 'render');

		render((
			<div>
				<Foo ref={foo} a="a" />
				<Bar ref={bar} b="b" />
			</div>
		), scratch);

		expect(Foo.prototype.render).to.have.been.calledWithExactly({ a:'a' }, { }, { });
		expect(Bar).to.have.been.calledWithExactly({ b:'b', ref:bar }, { });
	});

	// Test for #232
	it('should only null refs after unmount', () => {
		let root, outer, inner;

		class TestUnmount extends Component {
			componentWillUnmount() {
				expect(this).to.have.property('outer', outer);
				expect(this).to.have.property('inner', inner);
			}

			componentDidUnmount() {
				expect(this).to.have.property('outer', null);
				expect(this).to.have.property('inner', null);
			}

			render() {
				return (
					<div id="outer" ref={ c => this.outer=c }>
						<div id="inner" ref={ c => this.inner=c } />
					</div>
				);
			}
		}

		sinon.spy(TestUnmount.prototype, 'componentWillUnmount');
		sinon.spy(TestUnmount.prototype, 'componentDidUnmount');

		root = render(<div><TestUnmount /></div>, scratch, root);
		outer = scratch.querySelector('#outer');
		inner = scratch.querySelector('#inner');

		expect(TestUnmount.prototype.componentWillUnmount).not.to.have.been.called;
		expect(TestUnmount.prototype.componentDidUnmount).not.to.have.been.called;

		root = render(<div />, scratch, root);

		expect(TestUnmount.prototype.componentWillUnmount).to.have.been.calledOnce;
		expect(TestUnmount.prototype.componentDidUnmount).to.have.been.calledOnce;
	});

	it('should null and re-invoke refs when swapping component root element type', () => {
		let inst;

		class App extends Component {
			render() {
				return <div><Child /></div>;
			}
		}

		class Child extends Component {
			constructor(props, context) {
				super(props, context);
				this.state = { show:false };
				inst = this;
			}
			handleMount(){}
			render(_, { show }) {
				if (!show) return <div id="div" ref={this.handleMount}></div>;
				return <span id="span" ref={this.handleMount}>some test content</span>;
			}
		}
		sinon.spy(Child.prototype, 'handleMount');

		render(<App />, scratch);
		expect(inst.handleMount).to.have.been.calledOnce.and.calledWith(scratch.querySelector('#div'));
		inst.handleMount.reset();

		inst.setState({ show:true });
		inst.forceUpdate();
		expect(inst.handleMount).to.have.been.calledTwice;
		expect(inst.handleMount.firstCall).to.have.been.calledWith(null);
		expect(inst.handleMount.secondCall).to.have.been.calledWith(scratch.querySelector('#span'));
		inst.handleMount.reset();

		inst.setState({ show:false });
		inst.forceUpdate();
		expect(inst.handleMount).to.have.been.calledTwice;
		expect(inst.handleMount.firstCall).to.have.been.calledWith(null);
		expect(inst.handleMount.secondCall).to.have.been.calledWith(scratch.querySelector('#div'));
	});
});
