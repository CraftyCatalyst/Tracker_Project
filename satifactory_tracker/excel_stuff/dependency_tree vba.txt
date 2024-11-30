Sub Dependency_Tree()
'
' Dependency_Tree_Format Macro - This script uses data provided by the Python formula, formats it and displays it to the user.
'
    Dim ws As Worksheet
    Dim lookupValue As String
    Dim lookupRange As Range
    Dim returnRange As Range
    Dim DataRange As Range
    Dim result As Variant
    Dim lastRow As Long
    Dim i As Long
    Dim shiftValue As Long
    Dim checkCell As String
    Dim iRow As Long
    Dim iColumn As Long
    
    'Clear the Sheet
    Clear_Sheet
    
    Set ws = ThisWorkbook.Sheets("Dependency Tree")
    If ws.Cells(1, 2).Value = "(All)" Then
        MsgBox "Please select a single part from the drop-down.", vbExclamation, "Invalid Part"
        ws.Range("A2").Select
        Exit Sub
    End If
    
    
    ' Set the worksheet to get the data from
    Set ws = ThisWorkbook.Sheets("Python Init")
     ' Find the last used row in column A starting from A5
    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row


    ' Define the range starting from J6 to the last row
    Set DataRange = ws.Range("I6:N" & lastRow)

    ' Copy data
    DataRange.Copy
    
    ' Set the worksheet to copy the data to
    Set ws = ThisWorkbook.Sheets("Dependency Tree")

    ' Define the range starting from B5 to the last row
    Set DataRange = ws.Range("B6") ':D" & lastRow)
    
    ' Paste as values only
    DataRange.PasteSpecial Paste:=xlPasteValues
    Application.CutCopyMode = False ' Clear the clipboard

    Set DataRange = ws.Range("G6:G" & lastRow)
    DataRange.Copy
    Set DataRange = ws.Range("H6")
    DataRange.PasteSpecial Paste:=xlPasteValues
    Application.CutCopyMode = False ' Clear the clipboard
    
    'Loop though each row and get the part level for each item
    For i = 6 To lastRow
        ' Get the lookup value from column G
        lookupValue = ws.Cells(i, 8).Value

        ' Perform XLOOKUP to get the level for each part
        If lookupValue <> "N/A" And lookupValue <> "0" And lookupValue <> "NONE" And lookupValue <> "" Then
            result = Application.WorksheetFunction.XLookup(lookupValue, Worksheets("Part Recipes").Range("B:B"), Worksheets("Part Recipes").Range("C:C"))
        End If
        ' Write the result to column A
        ws.Cells(i, 1).Value = result

        ' Set formatting for column D
        With ws.Cells(i, 8)
            .Font.Bold = True
            .Font.Size = 12

            ' Set cell color based on result value
            Select Case result
                Case 0
                    ' Tan
                    .Interior.Color = RGB(255, 228, 181)
                Case 1
                    ' Red
                    .Interior.Color = RGB(255, 0, 0)
                Case 1.1, 1.2, 1.3
                    'Dark Red
                    .Interior.Color = RGB(192, 0, 0)
                    .Font.Color = RGB(255, 255, 255) ' Set font color to white
                Case 2
                    ' Orange
                    .Interior.Color = RGB(255, 165, 0)
                Case 3
                    ' Yellow
                    .Interior.Color = RGB(255, 255, 0)
                Case 4, 4.1
                    ' Green
                    .Interior.Color = RGB(0, 176, 80)
                Case 5
                    ' Blue
                    .Interior.Color = RGB(0, 0, 255)
                    .Font.Color = RGB(255, 255, 255) ' Set font color to white
                Case 6
                    ' Indigo
                    .Interior.Color = RGB(75, 0, 130)
                    .Font.Color = RGB(255, 255, 255) ' Set font color to white
                Case 7, 7.1, 7.2, 7.3
                    ' Violet
                    .Interior.Color = RGB(238, 130, 238)
                    .Font.Color = RGB(255, 255, 255) ' Set font color to white
                Case 8, 8.1
                    ' Ultra Violet
                    .Interior.Color = RGB(148, 0, 211)
                    .Font.Color = RGB(255, 255, 255) ' Set font color to white
                Case 11
                    ' Grayish
                    .Interior.Color = RGB(217, 217, 217)
            End Select
        End With
    Next i
           
    
    ' Now loop through each row to process column B and G
    For i = 6 To lastRow
        ' Read the value in column B
        shiftValue = ws.Cells(i, 2).Value
        

        If shiftValue = 0 Then
            GoTo SkipToNext
        End If

        ' Cut and paste the value in column F to the right
        ws.Cells(i, 8).Cut Destination:=ws.Cells(i, 8 + shiftValue)

SkipToNext:
    ' Continue to next row
    Next i
    
    'Format the worksheet
    FormatWorksheet
    
    ActiveWorkbook.RefreshAll
    
    Set DataRange = ws.Range("A4")
    DataRange.Select
    MsgBox "Job done.", vbInformation
   
    
End Sub


Sub Clear_Sheet()

 Dim ws As Worksheet
    
    Dim DataRange As Range
    Dim result As Variant
    Dim lastRow As Long
    

    'Clear the Sheet
    Set ws = ThisWorkbook.Sheets("Dependency Tree")
    lastRow = ws.Cells(ws.Rows.Count, 2).End(xlUp).Row
    If lastRow > 5 Then
        Set DataRange = ws.Range("A6:AA" & lastRow)
        DataRange.Clear
        DataRange.ClearFormats
    End If


End Sub

Sub FormatWorksheet()
    Dim ws As Worksheet
    Dim lastRow As Long

    ' Define your worksheet, adjust the name as necessary
    Set ws = ThisWorkbook.Sheets("Dependency Tree")

    ' Determine the last row (adjust the column as needed)
    lastRow = ws.Cells(ws.Rows.Count, "A").End(xlUp).Row

    ' Formatting columns
    With ws
        ' Format column E and F for 4 decimal places
        .Columns("E:F").NumberFormat = "0.0000"
        
        ' Set column widths for A:G
        .Columns("A:G").ColumnWidth = 22
        
        ' Align columns A, B, E, F to the right
        .Range("A:A,B:B,E:E,F:F").HorizontalAlignment = xlRight
        
        ' Align columns C, D, G to the left
        .Range("C:C,D:D,G:G").HorizontalAlignment = xlLeft

        ' Adjust row height for specific range
        .Range("A5:A" & lastRow).RowHeight = 15.6

        ' Format columns H:AA
        With .Columns("H:AA")
            .WrapText = True
            .ColumnWidth = 25.15
            .HorizontalAlignment = xlCenter
            .VerticalAlignment = xlCenter
        End With

        ' Format specific cells B1, B2 and A5:H5
        .Range("B1").HorizontalAlignment = xlLeft
        .Range("B2").HorizontalAlignment = xlCenter
        .Range("A5:H5").HorizontalAlignment = xlCenter
        .Range("A5:H5").VerticalAlignment = xlCenter
        
    End With
End Sub


Sub Choose_Alternate_Recipes()
    Sheets("Alt_Recipe_Selection").Select
    Range("Alt_Recipe_Selection[[#Headers],[Selection]]").Select
End Sub

Sub Back_To_Tree()

    Sheets("Dependency Tree").Select
    Range("A4").Select
End Sub