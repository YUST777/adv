import React, { useState, useEffect, useCallback, useRef } from 'react';
import { playTick, playClick, playError } from './sounds';

type Difficulty = 'easy' | 'medium' | 'hard';

interface Question {
  text: string;
  answer: number;
}

function generateQuestion(difficulty: Difficulty): Question {
  const ops = ['+', '-', '×'];
  if (difficulty !== 'easy') ops.push('÷');

  const op = ops[Math.floor(Math.random() * ops.length)];
  let a: number, b: number, answer: number;

  switch (difficulty) {
    case 'easy':
      a = Math.floor(Math.random() * 20) + 1;
      b = Math.floor(Math.random() * 20) + 1;
      break;
    case 'medium':
      a = Math.floor(Math.random() * 50) + 10;
      b = Math.floor(Math.random() * 30) + 5;
      break;
    case 'hard':
      a = Math.floor(Math.random() * 100) + 20;
      b = Math.floor(Math.random() * 50) + 10;
      break;
  }

  switch (op) {
    case '+': answer = a + b; break;
    case '-': answer = a - b; break;
    case '×': 
      if (difficulty === 'easy') { a = Math.floor(Math.random() * 12) + 1; b = Math.floor(Math.random() * 12) + 1; }
      else if (difficulty === 'medium') { a = Math.floor(Math.random() * 20) + 2; b = Math.floor(Math.random() * 15) + 2; }
      else { a = Math.floor(Math.random() * 30) + 5; b = Math.floor(Math.random() * 20) + 3; }
      answer = a * b;
      break;
    case '÷':
      answer = Math.floor(Math.random() * 20) + 2;
      b = Math.floor(Math.random() * 12) + 2;
      a = answer * b; // ensure clean division
      break;
    default: answer = a + b;
  }

  return { text: `${a} ${op} ${b}`, answer: answer! };
}

export default function MathGame() {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'ended'>('idle');
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [question, setQuestion] = useState<Question | null>(null);
  const [userInput, setUserInput] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startGame = useCallback(() => {
    playTick();
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setTimeLeft(30);
    setTotalAnswered(0);
    setUserInput('');
    setFeedback(null);
    setQuestion(generateQuestion(difficulty));
    setGameState('playing');
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [difficulty]);

  // Timer
  useEffect(() => {
    if (gameState !== 'playing') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setGameState('ended');
          playError();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState]);

  const submitAnswer = useCallback(() => {
    if (!question || !userInput) return;
    const parsed = parseInt(userInput);
    if (isNaN(parsed)) return;

    setTotalAnswered(prev => prev + 1);

    if (parsed === question.answer) {
      playClick();
      const points = difficulty === 'easy' ? 10 : difficulty === 'medium' ? 25 : 50;
      const streakBonus = streak >= 5 ? points : streak >= 3 ? Math.floor(points * 0.5) : 0;
      setScore(prev => prev + points + streakBonus);
      setStreak(prev => {
        const newStreak = prev + 1;
        setBestStreak(best => Math.max(best, newStreak));
        return newStreak;
      });
      setFeedback('correct');
      // Bonus time for correct answers
      setTimeLeft(prev => Math.min(prev + (difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3), 60));
    } else {
      playError();
      setStreak(0);
      setFeedback('wrong');
    }

    setUserInput('');
    setQuestion(generateQuestion(difficulty));
    setTimeout(() => setFeedback(null), 400);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [question, userInput, difficulty, streak]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      submitAnswer();
    }
  }, [submitAnswer]);

  const timerColor = timeLeft > 15 ? 'text-emerald-400' : timeLeft > 5 ? 'text-amber-400' : 'text-red-400';
  const timerBarWidth = (timeLeft / 30) * 100;
  const timerBarColor = timeLeft > 15 ? 'bg-emerald-500' : timeLeft > 5 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4">
      {gameState === 'idle' && (
        <div className="text-center animate-fade-in max-w-md">
          <div className="text-6xl mb-4">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-400 mx-auto"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          </div>
          <h2 className="text-3xl font-serif font-bold text-grey-50 mb-3">Speed Math</h2>
          <p className="text-grey-400 mb-8 text-sm leading-relaxed">
            Solve as many math problems as you can in 30 seconds. 
            Build streaks for bonus points. Correct answers add time!
          </p>

          <div className="flex justify-center gap-2 mb-8">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
              <button
                key={d}
                onClick={() => { playClick(); setDifficulty(d); }}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold capitalize transition-all duration-150 border ${
                  difficulty === d
                    ? 'bg-grey-50 text-grey-950 border-grey-50 shadow-lg'
                    : 'bg-grey-900 text-grey-300 border-grey-700 hover:border-grey-500 hover:text-grey-100'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          <button
            onClick={startGame}
            className="px-10 py-3 bg-grey-50 text-grey-950 font-bold rounded-full text-base hover:bg-grey-200 transition-all active:scale-95 shadow-lg"
          >
            Start Game
          </button>
        </div>
      )}

      {gameState === 'playing' && question && (
        <div className="w-full max-w-lg animate-fade-in">
          {/* Timer Bar */}
          <div className="w-full h-1.5 bg-grey-800 rounded-full mb-6 overflow-hidden">
            <div 
              className={`h-full ${timerBarColor} rounded-full transition-all duration-1000 ease-linear`}
              style={{ width: `${timerBarWidth}%` }}
            />
          </div>

          {/* Stats Row */}
          <div className="flex items-center justify-between mb-8 px-2">
            <div className="text-center">
              <div className="text-2xl font-mono font-bold text-grey-50">{score}</div>
              <div className="text-[10px] uppercase tracking-widest text-grey-500">Score</div>
            </div>
            <div className="text-center">
              <div className={`text-3xl font-mono font-bold ${timerColor}`}>{timeLeft}s</div>
              <div className="text-[10px] uppercase tracking-widest text-grey-500">Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-mono font-bold text-grey-50">{streak}<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="inline ml-1 text-orange-400"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 3l2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4l2-4z"/></svg></div>
              <div className="text-[10px] uppercase tracking-widest text-grey-500">Streak</div>
            </div>
          </div>

          {/* Question */}
          <div className={`bg-grey-900 border rounded-2xl p-8 text-center mb-6 transition-all duration-150 ${
            feedback === 'correct' ? 'border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.15)]' 
            : feedback === 'wrong' ? 'border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.15)]' 
            : 'border-grey-800'
          }`}>
            <div className="text-5xl font-mono font-bold text-grey-50 mb-6 tracking-wider">
              {question.text} = ?
            </div>
            <input
              ref={inputRef}
              type="number"
              value={userInput}
              onChange={e => setUserInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-48 mx-auto bg-grey-950 border-2 border-grey-700 rounded-xl px-4 py-3 text-2xl font-mono text-center text-grey-50 focus:border-grey-400 focus:outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              placeholder="?"
              autoFocus
            />
          </div>

          <button
            onClick={submitAnswer}
            className="w-full py-3.5 bg-grey-800 text-grey-50 font-bold rounded-xl text-base hover:bg-grey-700 transition-all active:scale-[0.98] border border-grey-700"
          >
            Submit (Enter ↵)
          </button>
        </div>
      )}

      {gameState === 'ended' && (
        <div className="text-center animate-fade-in max-w-md">
          <div className="text-6xl mb-4">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`mx-auto ${score >= 200 ? 'text-amber-400' : score >= 100 ? 'text-emerald-400' : 'text-grey-300'}`}><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>
          </div>
          <h2 className="text-3xl font-serif font-bold text-grey-50 mb-2">Time's Up!</h2>
          
          <div className="grid grid-cols-3 gap-3 my-8 bg-grey-900 border border-grey-800 rounded-xl p-5">
            <div className="text-center">
              <div className="text-3xl font-mono font-bold text-grey-50">{score}</div>
              <div className="text-[10px] uppercase tracking-widest text-grey-500 mt-1">Score</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-mono font-bold text-grey-50">{totalAnswered}</div>
              <div className="text-[10px] uppercase tracking-widest text-grey-500 mt-1">Answered</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-mono font-bold text-grey-50">{bestStreak}<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="inline ml-1 text-orange-400"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 3l2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4l2-4z"/></svg></div>
              <div className="text-[10px] uppercase tracking-widest text-grey-500 mt-1">Best Streak</div>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={startGame}
              className="px-8 py-3 bg-grey-50 text-grey-950 font-bold rounded-full text-sm hover:bg-grey-200 transition-all active:scale-95"
            >
              Play Again
            </button>
            <button
              onClick={() => { playClick(); setGameState('idle'); }}
              className="px-8 py-3 bg-grey-900 text-grey-200 font-bold rounded-full text-sm hover:bg-grey-800 transition-all active:scale-95 border border-grey-700"
            >
              Menu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
