import { h, render, rerender, Component } from '../../src/preact';
/** @jsx h */

describe('Component spec', () => {
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

	describe('defaultProps', () => {
		it('should apply default props on initial render', () => {
			class WithDefaultProps extends Component {
				constructor(props, context) {
					super(props, context);
					expect(props).to.be.deep.equal({
						fieldA: 1, fieldB: 2,
						fieldC: 1, fieldD: 2
					});
				}
				render() {
					return <div />;
				}
			}
			WithDefaultProps.defaultProps = { fieldC: 1, fieldD: 1 };
			render(<WithDefaultProps fieldA={1} fieldB={2} fieldD={2} />, scratch);
		});

		it('should apply default props on rerender', () => {
			let doRender;
			class Outer extends Component {
				constructor() {
					super();
					this.state = { i:1 };
				}
				componentDidMount() {
					doRender = () => this.setState({ i: 2 });
				}
				render(props, { i }) {
					return <WithDefaultProps fieldA={1} fieldB={i} fieldD={i} />;
				}
			}
			class WithDefaultProps extends Component {
				constructor(props, context) {
					super(props, context);
					this.ctor(props, context);
				}
				ctor(){}
				componentWillReceiveProps() {}
				render() {
					return <div />;
				}
			}
			WithDefaultProps.defaultProps = { fieldC: 1, fieldD: 1 };

			let proto = WithDefaultProps.prototype;
			sinon.spy(proto, 'ctor');
			sinon.spy(proto, 'componentWillReceiveProps');
			sinon.spy(proto, 'render');

			render(<Outer />, scratch);
			doRender();

			const PROPS1 = {
				fieldA: 1, fieldB: 1,
				fieldC: 1, fieldD: 1
			};

			const PROPS2 = {
				fieldA: 1, fieldB: 2,
				fieldC: 1, fieldD: 2
			};

			expect(proto.ctor).to.have.been.calledWith(PROPS1);
			expect(proto.render).to.have.been.calledWith(PROPS1);

			rerender();

			// expect(proto.ctor).to.have.been.calledWith(PROPS2);
			expect(proto.componentWillReceiveProps).to.have.been.calledWith(PROPS2);
			expect(proto.render).to.have.been.calledWith(PROPS2);
		});

		// @TODO: migrate this to preact-compat
		xit('should cache default props', () => {
			class WithDefaultProps extends Component {
				constructor(props, context) {
					super(props, context);
					expect(props).to.be.deep.equal({
						fieldA: 1, fieldB: 2,
						fieldC: 1, fieldD: 2,
						fieldX: 10
					});
				}
				getDefaultProps() {
					return { fieldA: 1, fieldB: 1 };
				}
				render() {
					return <div />;
				}
			}
			WithDefaultProps.defaultProps = { fieldC: 1, fieldD: 1 };
			sinon.spy(WithDefaultProps.prototype, 'getDefaultProps');
			render((
				<div>
					<WithDefaultProps fieldB={2} fieldD={2} fieldX={10} />
					<WithDefaultProps fieldB={2} fieldD={2} fieldX={10} />
					<WithDefaultProps fieldB={2} fieldD={2} fieldX={10} />
				</div>
			), scratch);
			expect(WithDefaultProps.prototype.getDefaultProps).to.be.calledOnce;
		});
	});
});
