import React from "react";
import ScheduleCard from "./ScheduleCard";

export function StudentToday({ schedules, isAdmin, handleEdit, handleDelete }) {
  if (!schedules || schedules.length === 0) return <p>No schedules for today.</p>;

  return schedules.map((s) => (
    <ScheduleCard
      key={s.id}
      schedule={s}
      isAdmin={isAdmin}
      onEdit={() => handleEdit(s)}
      onDelete={(sch) => handleDelete(sch)}
    />
  ));
}

export function StudentNextDay({ schedules, isAdmin, handleEdit, handleDelete }) {
  if (!schedules || schedules.length === 0) return <p>No schedules for next day.</p>;

  return schedules.map((s) => (
    <ScheduleCard
      key={s.id}
      schedule={s}
      isAdmin={isAdmin}
      onEdit={() => handleEdit(s)}
      onDelete={(sch) => handleDelete(sch)}
    />
  ));
}
