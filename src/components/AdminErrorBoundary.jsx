import { Component } from 'react';

export default class AdminErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return <main className="grid min-h-[50vh] place-items-center bg-white p-6">
        <section role="alert" className="w-full max-w-md rounded-2xl border border-black bg-white p-6 text-center shadow-lg">
          <h1 className="text-xl font-bold text-slate-950">Admin page could not load</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Return to the admin dashboard or refresh this page.</p>
          <button type="button" onClick={() => { this.setState({ failed: false }); window.history.pushState({}, '', '/admin'); window.dispatchEvent(new PopStateEvent('popstate')); }} className="mt-5 min-h-11 rounded-xl bg-black px-5 text-sm font-bold text-white">Admin Dashboard</button>
        </section>
      </main>;
    }
    return this.props.children;
  }
}
