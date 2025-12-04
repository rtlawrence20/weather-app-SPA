/** 
 * @typedef {import("../services/weatherApi").WeatherState} WeatherState 
 * @typedef {import("../services/units").UnitSystem} UnitSystem
*/

import { NavLink, useParams } from "react-router-dom";
import HourlyForecast from "./HourlyForecast";
import DailyForecast from "./DailyForecast";
import RoadConditions from "./RoadConditions";

const TABS = [
    { id: "hourly", label: "Hourly", path: "/forecast/hourly" },
    { id: "roads", label: "Road Conditions", path: "/forecast/roads" },
    { id: "daily", label: "7-Day Forecast", path: "/forecast/daily" },
];

/**
 * ForecastTabs component
 * @param {{ weather: WeatherState|null, unitSystem: UnitSystem }} props
 * @returns {JSX.Element} Forecast tabs component
 */
export default function ForecastTabs({ weather, unitSystem }) {
    const { type } = useParams();
    const current = TABS.find((t) => t.id === type) ?? TABS[0];

    return (
        <div className="space-y-4">
            <div
                className="inline-flex rounded-full bg-slate-900/70 p-1 border border-slate-700"
                role="tablist"
            >
                {TABS.map((tab) => (
                    <NavLink
                        key={tab.id}
                        to={tab.path}
                        role="tab"
                        aria-selected={current.id === tab.id}
                        className={({ isActive }) =>
                            [
                                "px-4 py-1.5 text-sm font-medium rounded-full transition-colors",
                                isActive
                                    ? "bg-sky-500 text-slate-900 shadow"
                                    : "text-slate-300 hover:bg-slate-800",
                            ].join(" ")
                        }
                    >
                        {tab.label}
                    </NavLink>
                ))}
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4 sm:p-5 shadow-inner">
                {current.id === "hourly" && <HourlyForecast weather={weather} unitSystem={unitSystem} />}
                {current.id === "roads" && <RoadConditions weather={weather} unitSystem={unitSystem} />}
                {current.id === "daily" && <DailyForecast weather={weather} unitSystem={unitSystem} />}
            </div>
        </div>
    );
}
