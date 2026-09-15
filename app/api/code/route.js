const AIRTABLE_API = "https://api.airtable.com/v0";

function getConfig() {
  const token = process.env.AIRTABLE_PAT;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const tableName = process.env.AIRTABLE_TABLE_NAME || "Code";

  if (!token) {
    throw new Error("AIRTABLE_PAT is not configured.");
  }

  if (!baseId) {
    throw new Error("AIRTABLE_BASE_ID is not configured.");
  }

  return {
    token,
    baseId,
    tableName,
  };
}

function airtableHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function GET() {
  try {
    const { token, baseId, tableName } = getConfig();

    const url = `${AIRTABLE_API}/${baseId}/${encodeURIComponent(
      tableName
    )}?pageSize=100`;

    const response = await fetch(url, {
      method: "GET",
      headers: airtableHeaders(token),
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok) {
      return Response.json(
        {
          error:
            data?.error?.message ||
            "Unable to read CodeVault from Airtable.",
        },
        { status: response.status }
      );
    }

    let records = data.records || [];

    let offset = data.offset;

    while (offset) {
      const nextUrl =
        `${AIRTABLE_API}/${baseId}/${encodeURIComponent(
          tableName
        )}?pageSize=100&offset=${encodeURIComponent(offset)}`;

      const nextResponse = await fetch(nextUrl, {
        method: "GET",
        headers: airtableHeaders(token),
        cache: "no-store",
      });

      const nextData = await nextResponse.json();

      if (!nextResponse.ok) {
        return Response.json(
          {
            error:
              nextData?.error?.message ||
              "Unable to read all CodeVault records.",
          },
          { status: nextResponse.status }
        );
      }

      records = [...records, ...(nextData.records || [])];

      offset = nextData.offset;
    }

    return Response.json({
      records,
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected Airtable error.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { token, baseId, tableName } = getConfig();

    const body = await request.json();

    const project =
      typeof body.project === "string"
        ? body.project.trim()
        : "";

    const folder =
      typeof body.folder === "string"
        ? body.folder.trim() || "/"
        : "/";

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const code =
      typeof body.code === "string"
        ? body.code
        : "";

    if (!project) {
      return Response.json(
        { error: "Project is required." },
        { status: 400 }
      );
    }

    if (!name) {
      return Response.json(
        { error: "File name is required." },
        { status: 400 }
      );
    }

    const url = `${AIRTABLE_API}/${baseId}/${encodeURIComponent(
      tableName
    )}`;

    const response = await fetch(url, {
      method: "POST",
      headers: airtableHeaders(token),
      body: JSON.stringify({
        fields: {
          Project: project,
          "File/Folder": folder,
          Name: name,
          Code: code,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return Response.json(
        {
          error:
            data?.error?.message ||
            "Unable to create the file in Airtable.",
        },
        { status: response.status }
      );
    }

    return Response.json(
      {
        record: data,
      },
      { status: 201 }
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected Airtable error.",
      },
      { status: 500 }
    );
  }
}