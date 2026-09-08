'use client';

import { useState } from 'react';

const OP_SYMBOL: Record<string, string> = { '+': '+', '-': '\u2212', '*': '\u00d7', '/': '\u00f7' };

export default function CalculatorTab() {
  const [expression, setExpression] = useState('');
  const [display, setDisplay] = useState('0');
  const [prev, setPrev] = useState<number | null>(null);
  const [op, setOp] = useState<string | null>(null);
  const [freshInput, setFreshInput] = useState(true);

  function inputDigit(d: string) {
    let next: string;
    if (freshInput) {
      next = d === '.' ? '0.' : d;
      setFreshInput(false);
    } else {
      if (d === '.' && display.includes('.')) return;
      next = display === '0' && d !== '.' ? d : display + d;
    }
    setDisplay(next);
    setExpression((expr) => {
      if (freshInput || display === '0') {
        // replace the trailing number in the expression with the new one
        const withoutLastNumber = expr.replace(/[\d.]+$/, '');
        return withoutLastNumber + next;
      }
      return expr.slice(0, expr.length - display.length) + next;
    });
  }

  function clearAll() {
    setDisplay('0');
    setExpression('');
    setPrev(null);
    setOp(null);
    setFreshInput(true);
  }

  function applyOp(nextOp: string) {
    const current = parseFloat(display);
    let newPrev = current;
    if (prev === null) {
      newPrev = current;
    } else if (op) {
      newPrev = compute(prev, current, op);
    }
    setPrev(newPrev);
    setOp(nextOp);
    setFreshInput(true);
    setExpression(`${newPrev} ${OP_SYMBOL[nextOp]} `);
    setDisplay(String(newPrev));
  }

  function compute(a: number, b: number, operator: string): number {
    switch (operator) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/': return b === 0 ? NaN : a / b;
      default: return b;
    }
  }

  function equals() {
    if (prev === null || !op) return;
    const current = parseFloat(display);
    const result = compute(prev, current, op);
    setExpression(`${prev} ${OP_SYMBOL[op]} ${current} =`);
    setDisplay(Number.isFinite(result) ? String(result) : 'Error');
    setPrev(null);
    setOp(null);
    setFreshInput(true);
  }

  const buttons = [
    ['C', '\u00b1', '%', '/'],
    ['7', '8', '9', '*'],
    ['4', '5', '6', '-'],
    ['1', '2', '3', '+'],
    ['0', '.', '='],
  ];

  function handlePress(btn: string) {
    if (btn === 'C') return clearAll();
    if (btn === '=') return equals();
    if (btn === '\u00b1') {
      const negated = String(parseFloat(display) * -1);
      setDisplay(negated);
      setExpression((expr) => expr.slice(0, expr.length - display.length) + negated);
      return;
    }
    if (btn === '%') {
      const pct = String(parseFloat(display) / 100);
      setDisplay(pct);
      setExpression((expr) => expr.slice(0, expr.length - display.length) + pct);
      return;
    }
    if (['+', '-', '*', '/'].includes(btn)) return applyOp(btn);
    return inputDigit(btn);
  }

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-[320px] rounded-lg border border-[var(--border)] bg-[var(--card)] p-5">
        <h3 className="mb-4 text-base font-bold text-[var(--text)]">Calculator</h3>

        <div className="mb-4 rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-4">
          <div className="h-5 truncate text-right text-sm text-[var(--subtext)]">{expression || '\u00a0'}</div>
          <div className="truncate text-right text-3xl font-semibold text-[var(--text)]">{display}</div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {buttons.flat().map((btn, i) => {
            const isZero = btn === '0';
            const isOp = ['/', '*', '-', '+', '='].includes(btn);
            return (
              <button
                key={i}
                onClick={() => handlePress(btn)}
                className={`rounded-md py-3.5 text-sm font-semibold ${
                  isZero ? 'col-span-2' : ''
                } ${
                  isOp
                    ? 'bg-[#e5231b] text-white hover:bg-[#c91d16]'
                    : 'bg-[var(--input-bg)] text-[var(--text)] hover:bg-[var(--border)]'
                }`}
              >
                {btn}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
