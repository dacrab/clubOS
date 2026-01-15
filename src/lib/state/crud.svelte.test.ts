import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCrud } from './crud.svelte';

vi.mock('svelte-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('$app/navigation', () => ({ invalidateAll: vi.fn() }));
vi.mock('$lib/i18n/index.svelte', () => ({ t: (key: string) => key === 'common.deleteConfirm' ? 'Delete {name}?' : key }));

const mockConfirm = vi.fn();
global.confirm = mockConfirm;

type TestItem = { id: string; name: string; value: number };
type TestForm = { name: string; value: number };

describe('createCrud', () => {
	const toForm = (item: TestItem | null): TestForm => item ? { name: item.name, value: item.value } : { name: '', value: 0 };
	const getId = (item: TestItem): string => item.id;
	const getName = (item: TestItem): string => item.name;

	let onCreate: ReturnType<typeof vi.fn>;
	let onUpdate: ReturnType<typeof vi.fn>;
	let onDelete: ReturnType<typeof vi.fn>;
	let crud: ReturnType<typeof createCrud<TestItem, TestForm>>;

	beforeEach(() => {
		onCreate = vi.fn().mockResolvedValue({ error: null });
		onUpdate = vi.fn().mockResolvedValue({ error: null });
		onDelete = vi.fn().mockResolvedValue({ error: null });
		crud = createCrud({
			toForm,
			onCreate: onCreate as (form: TestForm) => Promise<{ error: unknown }>,
			onUpdate: onUpdate as (id: string, form: TestForm) => Promise<{ error: unknown }>,
			onDelete: onDelete as (id: string) => Promise<{ error: unknown }>,
			getId,
			getName,
		});
		vi.clearAllMocks();
	});

	describe('initial state', () => {
		it('has correct defaults', () => {
			expect(crud.open).toBe(false);
			expect(crud.editing).toBe(null);
			expect(crud.saving).toBe(false);
			expect(crud.isEdit).toBe(false);
			expect(crud.form).toEqual({ name: '', value: 0 });
		});
	});

	describe('state transitions', () => {
		it('openCreate sets state', () => {
			crud.openCreate();
			expect(crud.open).toBe(true);
			expect(crud.editing).toBe(null);
			expect(crud.isEdit).toBe(false);
		});

		it('openEdit sets state', () => {
			const item: TestItem = { id: '1', name: 'Test', value: 42 };
			crud.openEdit(item);
			expect(crud.open).toBe(true);
			expect(crud.editing).toEqual(item);
			expect(crud.isEdit).toBe(true);
			expect(crud.form).toEqual({ name: 'Test', value: 42 });
		});

		it('close sets open to false', () => {
			crud.openCreate();
			crud.close();
			expect(crud.open).toBe(false);
		});
	});

	describe('save', () => {
		it('calls onCreate for new item', async () => {
			crud.openCreate();
			crud.form = { name: 'New', value: 123 };
			await crud.save();
			expect(onCreate).toHaveBeenCalledWith({ name: 'New', value: 123 });
			expect(crud.open).toBe(false);
		});

		it('calls onUpdate for existing item', async () => {
			crud.openEdit({ id: '1', name: 'Test', value: 42 });
			crud.form = { name: 'Updated', value: 456 };
			await crud.save();
			expect(onUpdate).toHaveBeenCalledWith('1', { name: 'Updated', value: 456 });
			expect(crud.open).toBe(false);
		});

		it('returns false on error', async () => {
			onCreate.mockResolvedValue({ error: 'fail' });
			crud.openCreate();
			const result = await crud.save();
			expect(result).toBe(false);
			expect(crud.open).toBe(true);
		});

		it('sets saving during operation', async () => {
			let savingDuringCall = false;
			onCreate.mockImplementation(async () => { savingDuringCall = crud.saving; return { error: null }; });
			crud.openCreate();
			await crud.save();
			expect(savingDuringCall).toBe(true);
			expect(crud.saving).toBe(false);
		});
	});

	describe('remove', () => {
		const item: TestItem = { id: '1', name: 'Test', value: 42 };

		it('calls onDelete after confirmation', async () => {
			mockConfirm.mockReturnValue(true);
			await crud.remove(item);
			expect(mockConfirm).toHaveBeenCalledWith('Delete Test?');
			expect(onDelete).toHaveBeenCalledWith('1');
		});

		it('does not delete if cancelled', async () => {
			mockConfirm.mockReturnValue(false);
			const result = await crud.remove(item);
			expect(result).toBe(false);
			expect(onDelete).not.toHaveBeenCalled();
		});

		it('returns false on error', async () => {
			mockConfirm.mockReturnValue(true);
			onDelete.mockResolvedValue({ error: 'fail' });
			const result = await crud.remove(item);
			expect(result).toBe(false);
		});
	});
});
