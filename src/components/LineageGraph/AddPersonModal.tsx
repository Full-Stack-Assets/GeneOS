import React, { useState } from 'react';
import { X, Plus, User, Calendar, MapPin, Briefcase } from 'lucide-react';
import { TreeData, Person } from '../../types/genealogy';

interface AddPersonModalProps {
  tree: TreeData;
  onClose: () => void;
  onSavePerson: (person: Partial<Person>, parentIds?: string[], spouseId?: string) => void;
}

export const AddPersonModal: React.FC<AddPersonModalProps> = ({
  tree,
  onClose,
  onSavePerson,
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<'M' | 'F' | 'U'>('M');
  const [birthDate, setBirthDate] = useState('');
  const [birthPlace, setBirthPlace] = useState('');
  const [deathDate, setDeathDate] = useState('');
  const [deathPlace, setDeathPlace] = useState('');
  const [occupation, setOccupation] = useState('');
  const [notes, setNotes] = useState('');

  const [fatherId, setFatherId] = useState('');
  const [motherId, setMotherId] = useState('');
  const [spouseId, setSpouseId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) return;

    const parentIds: string[] = [];
    if (fatherId) parentIds.push(fatherId);
    if (motherId) parentIds.push(motherId);

    onSavePerson(
      {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        gender,
        birthDate: birthDate.trim() || undefined,
        birthPlace: birthPlace.trim() || undefined,
        deathDate: deathDate.trim() || undefined,
        deathPlace: deathPlace.trim() || undefined,
        occupation: occupation.trim() || undefined,
        notes: notes.trim() || undefined,
        confidenceScore: 0.85,
        tags: ['USER_ENTERED'],
      },
      parentIds.length > 0 ? parentIds : undefined,
      spouseId || undefined
    );
    onClose();
  };

  const malePersons = tree.persons.filter((p) => p.gender === 'M');
  const femalePersons = tree.persons.filter((p) => p.gender === 'F');

  return (
    <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
        <div className="p-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-amber-400" />
            <h3 className="font-['Cinzel'] font-bold text-base text-amber-100">
              Add Individual to Claim Ledger
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-stone-400 mb-1">First & Middle Names *</label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Margaret"
                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-stone-400 mb-1">Last Name / Maiden Surname</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Coffin"
                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-stone-400 mb-1">Gender</label>
            <div className="flex items-center gap-4 text-xs text-stone-300">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" checked={gender === 'M'} onChange={() => setGender('M')} name="gender" />
                Male
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" checked={gender === 'F'} onChange={() => setGender('F')} name="gender" />
                Female
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" checked={gender === 'U'} onChange={() => setGender('U')} name="gender" />
                Unknown
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-stone-400 mb-1">Birth Date</label>
              <input
                type="text"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                placeholder="e.g. 1812-04-18"
                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-stone-400 mb-1">Birth Place</label>
              <input
                type="text"
                value={birthPlace}
                onChange={(e) => setBirthPlace(e.target.value)}
                placeholder="e.g. Mount Stewart, PEI"
                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-stone-400 mb-1">Death Date</label>
              <input
                type="text"
                value={deathDate}
                onChange={(e) => setDeathDate(e.target.value)}
                placeholder="e.g. 1888-11-03"
                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-stone-400 mb-1">Death Place</label>
              <input
                type="text"
                value={deathPlace}
                onChange={(e) => setDeathPlace(e.target.value)}
                placeholder="e.g. French River, PEI"
                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-stone-400 mb-1">Occupation</label>
            <input
              type="text"
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              placeholder="e.g. Blacksmith, Shipwright, Homemaker"
              className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Kinship Linkage Section */}
          <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 space-y-3">
            <h4 className="text-[11px] font-mono uppercase text-amber-400 font-bold">
              Link to Existing Family Tree
            </h4>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-mono text-stone-400 mb-1">Father</label>
                <select
                  value={fatherId}
                  onChange={(e) => setFatherId(e.target.value)}
                  className="w-full bg-stone-900 border border-stone-800 rounded-lg px-2 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="">None / Unknown</option>
                  {malePersons.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} ({p.birthDate ? p.birthDate.substring(0, 4) : '?'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-stone-400 mb-1">Mother</label>
                <select
                  value={motherId}
                  onChange={(e) => setMotherId(e.target.value)}
                  className="w-full bg-stone-900 border border-stone-800 rounded-lg px-2 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="">None / Unknown</option>
                  {femalePersons.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} ({p.birthDate ? p.birthDate.substring(0, 4) : '?'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-stone-400 mb-1">Spouse</label>
              <select
                value={spouseId}
                onChange={(e) => setSpouseId(e.target.value)}
                className="w-full bg-stone-900 border border-stone-800 rounded-lg px-2 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
              >
                <option value="">None</option>
                {tree.persons.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName} ({p.birthDate ? p.birthDate.substring(0, 4) : '?'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-stone-400 mb-1">Research Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Initial biographical commentary, land deed citations, or research questions..."
              className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="pt-3 border-t border-stone-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs font-medium text-stone-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-semibold text-stone-950 shadow transition"
            >
              Save to Claim Ledger
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
