"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Question } from "@/data/quiz";

type Phase = "answering" | "revealed" | "done";

export function QuizRunner({
  questions,
  categorySlug,
}: {
  questions: Question[];
  categorySlug: string;
}) {
  // Stable shuffled order for this mount.
  const ordered = useMemo(() => shuffle(questions), [questions]);

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("answering");
  const [score, setScore] = useState(0);
  const [answeredCorrect, setAnsweredCorrect] = useState<boolean[]>([]);

  const total = ordered.length;
  const current = ordered[index];

  function choose(choiceIndex: number) {
    if (phase !== "answering") return;
    const correct = choiceIndex === current.answerIndex;
    setSelected(choiceIndex);
    setPhase("revealed");
    if (correct) setScore((s) => s + 1);
    setAnsweredCorrect((a) => [...a, correct]);
  }

  function next() {
    if (index + 1 >= total) {
      setPhase("done");
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setPhase("answering");
  }

  function restart() {
    setIndex(0);
    setSelected(null);
    setPhase("answering");
    setScore(0);
    setAnsweredCorrect([]);
  }

  if (phase === "done") {
    const pct = Math.round((score / total) * 100);
    const passed = pct >= 70;
    return (
      <div className="quiz-result">
        <div className={`score-ring ${passed ? "pass" : "fail"}`}>
          <span className="score-pct">{pct}%</span>
          <span className="score-frac">
            {score} / {total}
          </span>
        </div>
        <h2>{passed ? "Nice work — passing score." : "Keep studying."}</h2>
        <p className="quiz-result-note">
          Journeyman exams generally require around 70% to pass. Review the
          articles for any topics you missed.
        </p>
        <div className="quiz-actions">
          <button className="btn-primary" onClick={restart}>
            Retake quiz
          </button>
          <Link className="btn-secondary" href={`/category/${categorySlug}`}>
            Review articles
          </Link>
          <Link className="btn-secondary" href="/quiz">
            All quizzes
          </Link>
        </div>
      </div>
    );
  }

  const revealed = phase === "revealed";

  return (
    <div className="quiz">
      <div className="quiz-progress">
        <div className="quiz-progress-bar">
          <div
            className="quiz-progress-fill"
            style={{ width: `${(index / total) * 100}%` }}
          />
        </div>
        <div className="quiz-progress-text">
          <span>
            Question {index + 1} of {total}
          </span>
          <span>Score: {score}</span>
        </div>
      </div>

      <p className="quiz-prompt">{current.prompt}</p>

      <ul className="quiz-choices">
        {current.choices.map((choice, i) => {
          const isCorrect = i === current.answerIndex;
          const isSelected = i === selected;
          let cls = "quiz-choice";
          if (revealed && isCorrect) cls += " correct";
          else if (revealed && isSelected && !isCorrect) cls += " wrong";
          return (
            <li key={i}>
              <button
                className={cls}
                onClick={() => choose(i)}
                disabled={revealed}
                aria-pressed={isSelected}
              >
                <span className="quiz-choice-letter">
                  {String.fromCharCode(65 + i)}
                </span>
                <span>{choice}</span>
                {revealed && isCorrect && <span className="quiz-mark">✓</span>}
                {revealed && isSelected && !isCorrect && (
                  <span className="quiz-mark">✗</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {revealed && (
        <div className="quiz-explanation">
          <p>{current.explanation}</p>
          <Link href={`/article/${current.articleSlug}`}>
            Read the full article →
          </Link>
        </div>
      )}

      {revealed && (
        <div className="quiz-actions">
          <button className="btn-primary" onClick={next}>
            {index + 1 >= total ? "See results" : "Next question"}
          </button>
        </div>
      )}
    </div>
  );
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
